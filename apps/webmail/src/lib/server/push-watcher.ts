import type { JMAPEmail } from '$lib/jmap/types';
import { mailListHref, mailThreadHref, INBOX_MAILBOX_ROUTE_ID } from '$lib/mail/routes';
import { createConnectedClient } from '$lib/server/jmap';
import { sendPushNotification } from '$lib/server/push-sender';
import { isPushConfigured } from '$lib/server/push-config';
import {
	listPushSubscriptions,
	removePushSubscription,
	type StoredPushSubscription
} from '$lib/server/push-subscriptions';
import { accountKey, readAccountsById, type SessionData } from '$lib/server/session';

const RECONNECT_DELAY_MS = 5_000;
const POLL_INTERVAL_MS = 30_000;
/** Re-read a subscription's account set periodically so added/removed accounts are picked up. */
const ACCOUNT_RESYNC_MS = 5 * 60_000;

type ConnectedClient = Awaited<ReturnType<typeof createConnectedClient>>;

class PushWatcher {
	private started = false;
	private watchers = new Map<string, SubscriptionWatcher>();

	async start(): Promise<void> {
		if (this.started || !isPushConfigured()) return;
		this.started = true;
		await this.syncWatchers();
	}

	async refresh(): Promise<void> {
		if (!this.started) return;
		await this.syncWatchers();
	}

	stop(): void {
		for (const watcher of this.watchers.values()) watcher.stop();
		this.watchers.clear();
		this.started = false;
	}

	private async syncWatchers(): Promise<void> {
		const records = await listPushSubscriptions();
		const activeIds = new Set(records.map((record) => record.id));

		for (const id of this.watchers.keys()) {
			if (!activeIds.has(id)) {
				this.watchers.get(id)?.stop();
				this.watchers.delete(id);
			}
		}

		for (const record of records) {
			if (this.watchers.has(record.id)) continue;
			const watcher = new SubscriptionWatcher(record, () => this.handleRecordRemoved(record.id));
			this.watchers.set(record.id, watcher);
			void watcher.start();
		}
	}

	private handleRecordRemoved(id: string): void {
		this.watchers.get(id)?.stop();
		this.watchers.delete(id);
	}
}

/** One push subscription (device/browser) → one inbox watcher per account in its session. */
class SubscriptionWatcher {
	private stopped = false;
	private accountWatchers = new Map<string, AccountWatcher>();
	private resyncTimer: ReturnType<typeof setInterval> | null = null;

	constructor(
		private record: StoredPushSubscription,
		private onInvalid: () => void
	) {}

	async start(): Promise<void> {
		await this.syncAccounts();
		this.resyncTimer = setInterval(() => void this.syncAccounts(), ACCOUNT_RESYNC_MS);
	}

	/** Reconcile the per-account watchers with the session's current account set. */
	private async syncAccounts(): Promise<void> {
		if (this.stopped) return;
		const accounts = readAccountsById(this.record.sessionId);
		if (!accounts.length) {
			await removePushSubscription(this.record.id);
			this.onInvalid();
			return;
		}

		// Only label notifications with the account when there's more than one.
		const showAccount = accounts.length > 1;
		const wanted = new Set(accounts.map((account) => accountKey(account.username)));

		for (const [key, watcher] of this.accountWatchers) {
			if (!wanted.has(key)) {
				watcher.stop();
				this.accountWatchers.delete(key);
			}
		}

		for (const account of accounts) {
			const key = accountKey(account.username);
			const existing = this.accountWatchers.get(key);
			if (existing) {
				existing.setShowAccount(showAccount);
				continue;
			}
			const watcher = new AccountWatcher(this.record, account, showAccount, this.onInvalid);
			this.accountWatchers.set(key, watcher);
			void watcher.start();
		}
	}

	stop(): void {
		this.stopped = true;
		this.resyncTimer && clearInterval(this.resyncTimer);
		this.resyncTimer = null;
		for (const watcher of this.accountWatchers.values()) watcher.stop();
		this.accountWatchers.clear();
	}
}

/** Watches one account's inbox and emits account-aware push notifications. */
class AccountWatcher {
	private stopped = false;
	private pollTimer: ReturnType<typeof setInterval> | null = null;
	private streamAbort: AbortController | null = null;
	// In-memory state: avoids per-account persistence. After a server restart the watcher
	// re-initialises from the current state (no notification for mail during downtime).
	private emailState?: string;
	private readonly key: string;
	private readonly label: string;

	constructor(
		private record: StoredPushSubscription,
		private account: SessionData,
		private showAccount: boolean,
		private onInvalid: () => void
	) {
		this.key = accountKey(account.username);
		this.label = account.displayName?.trim() || account.username;
	}

	setShowAccount(value: boolean): void {
		this.showAccount = value;
	}

	async start(): Promise<void> {
		try {
			const client = await createConnectedClient(this.account);
			const mailboxes = await client.getMailboxes();
			const inbox = mailboxes.find((mailbox) => mailbox.role === 'inbox');
			if (!inbox) return; // no inbox for this account — nothing to watch

			const states = await client.fetchSyncStates();
			this.emailState = states.Email;

			if (client.getSession()?.eventSourceUrl) {
				void this.watchEventStream(client, inbox.id);
			} else {
				this.startPolling(client, inbox.id);
			}
		} catch (error) {
			console.warn('[push-watcher] Failed to start watcher for', this.key, error);
			this.scheduleRestart();
		}
	}

	stop(): void {
		this.stopped = true;
		this.pollTimer && clearInterval(this.pollTimer);
		this.pollTimer = null;
		this.streamAbort?.abort();
		this.streamAbort = null;
	}

	private scheduleRestart(): void {
		if (this.stopped) return;
		setTimeout(() => {
			if (!this.stopped) void this.start();
		}, RECONNECT_DELAY_MS);
	}

	private startPolling(client: ConnectedClient, inboxId: string) {
		this.pollTimer = setInterval(() => {
			void this.checkForNewMail(client, inboxId);
		}, POLL_INTERVAL_MS);
	}

	private async watchEventStream(client: ConnectedClient, inboxId: string) {
		while (!this.stopped) {
			this.streamAbort = new AbortController();

			try {
				const response = await client.openEventStream();
				if (!response.ok || !response.body) {
					throw new Error(`Event stream failed (${response.status})`);
				}

				const reader = response.body.getReader();
				const decoder = new TextDecoder();
				let buffer = '';

				while (!this.stopped) {
					const { done, value } = await reader.read();
					if (done) break;

					buffer += decoder.decode(value, { stream: true });
					const chunks = buffer.split('\n\n');
					buffer = chunks.pop() ?? '';

					for (const chunk of chunks) {
						const dataLine = chunk
							.split('\n')
							.find((line) => line.startsWith('data:'))
							?.slice(5)
							.trim();
						if (!dataLine) continue;

						try {
							const payload = JSON.parse(dataLine) as {
								'@type'?: string;
								changed?: Record<string, { Email?: string }>;
							};
							if (payload['@type'] !== 'StateChange') continue;

							const accountId = client.getAccountId();
							const emailState = payload.changed?.[accountId]?.Email;
							if (emailState) {
								await this.processEmailState(client, inboxId, emailState);
							}
						} catch {
							// Ignore malformed SSE payloads
						}
					}
				}
			} catch (error) {
				if (!this.stopped) {
					console.warn('[push-watcher] Event stream disconnected for', this.key, error);
				}
			} finally {
				this.streamAbort = null;
			}

			if (!this.stopped) {
				await new Promise((resolve) => setTimeout(resolve, RECONNECT_DELAY_MS));
			}
		}
	}

	private async checkForNewMail(client: ConnectedClient, inboxId: string) {
		if (this.stopped || !this.emailState) return;

		try {
			const states = await client.fetchSyncStates();
			const nextState = states.Email;
			if (!nextState || nextState === this.emailState) return;
			await this.processEmailState(client, inboxId, nextState);
		} catch (error) {
			console.warn('[push-watcher] Poll failed for', this.key, error);
		}
	}

	private async processEmailState(client: ConnectedClient, inboxId: string, newState: string) {
		if (!this.emailState || newState === this.emailState) {
			this.emailState = newState;
			return;
		}

		let sinceState = this.emailState;
		let latestState = newState;
		const created: string[] = [];

		try {
			while (true) {
				const changes = await client.getEmailChanges(sinceState);
				created.push(...changes.created);
				latestState = changes.newState;
				if (!changes.hasMoreChanges) break;
				sinceState = changes.newState;
			}
		} catch (error) {
			console.warn('[push-watcher] Email/changes failed for', this.key, error);
			this.emailState = newState;
			return;
		}

		this.emailState = latestState;
		if (!created.length) return;

		const emails = await client.getEmailsByIds(created);
		const incoming = emails.filter(
			(email) => email.mailboxIds?.[inboxId] && !email.keywords?.$seen
		);
		if (!incoming.length) return;

		await this.notifyIncomingMail(client, inboxId, incoming);
	}

	private async getInboxUnreadCount(client: ConnectedClient, inboxId: string): Promise<number | undefined> {
		try {
			const mailboxes = await client.getMailboxes();
			const inbox = mailboxes.find((mailbox) => mailbox.id === inboxId);
			return inbox?.unreadEmails;
		} catch {
			return undefined;
		}
	}

	/** Notification URL — carries ?account so clicking switches to the right account first. */
	private notificationUrl(threadId?: string): string {
		if (!threadId) {
			if (!this.showAccount) return '/';
			return `${mailListHref(INBOX_MAILBOX_ROUTE_ID)}?account=${encodeURIComponent(this.key)}`;
		}
		const base = mailThreadHref(INBOX_MAILBOX_ROUTE_ID, threadId);
		if (!this.showAccount) return base;
		const separator = base.includes('?') ? '&' : '?';
		return `${base}${separator}account=${encodeURIComponent(this.key)}`;
	}

	private async notifyIncomingMail(client: ConnectedClient, inboxId: string, emails: JMAPEmail[]) {
		const unreadCount = await this.getInboxUnreadCount(client, inboxId);

		let result;
		if (emails.length === 1) {
			const email = emails[0];
			const from = email.from?.[0]?.name?.trim() || email.from?.[0]?.email || 'Someone';
			const subject = email.subject?.trim() || '(no subject)';
			result = await sendPushNotification(this.record, {
				title: this.showAccount ? this.label : 'New mail',
				body: `${from}: ${subject}`,
				url: this.notificationUrl(email.threadId),
				tag: `zaur-new-mail-${this.key}`,
				unreadCount
			});
		} else {
			result = await sendPushNotification(this.record, {
				title: this.showAccount ? this.label : 'New mail',
				body: `${emails.length} unseen messages in Inbox`,
				url: this.notificationUrl(),
				tag: `zaur-new-mail-${this.key}`,
				unreadCount
			});
		}

		// The subscription record was deleted by the sender; stop watching it.
		if (result === 'gone') this.onInvalid();
	}
}

export const pushWatcher = new PushWatcher();
