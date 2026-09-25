/**
 * Decides when to push. Ported from webmail 1.0's watcher, which has run in
 * production since the first push release:
 *
 *   PushWatcher           every subscription row in the store
 *   └ SubscriptionWatcher the accounts in that row's session (re-read every 5 min)
 *     └ AccountWatcher    one inbox: JMAP event stream (polling if the server has
 *                         none) → Email/changes → new unseen inbox mail → sendPush
 *
 * Email state is kept in memory, so mail that arrives while this process is
 * down is not announced after a restart. Two things differ from 1.0: a watcher
 * that cannot connect backs off instead of retrying every five seconds forever,
 * and an account that fails auth is left for the next resync rather than taking
 * its session's subscription with it. 1.0's watcher refreshes tokens for the
 * same shared sessions; a refresh race between the two must not cost a device
 * its notifications.
 */
import {
	accountKey,
	getStoreDb,
	deletePushSubscription,
	listPushSubscriptions,
	prunePushSubscriptions,
	readAccountsById,
	type PushSubscriptionRow,
	type SessionData
} from '@zaur/server-auth';
import type { JMAPClient, JMAPEmail } from '@zaur/mail-core';
import { aiCategoriesOn, categorizeInBackground } from '#lib/server/categorize';
import { createConnectedClient } from '#lib/server/jmap';
import { pushPublicKey, sendPush, type PushMessage } from '#lib/server/push';

const POLL_INTERVAL_MS = 30_000;
const ACCOUNT_RESYNC_MS = 5 * 60_000;
const RETRY_MIN_MS = 5_000;
const RETRY_MAX_MS = 5 * 60_000;
/** Browsers re-subscribe on every load; a month without one is an abandoned device. */
const SUBSCRIPTION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/** The notification for new inbox mail; `showAccount` once a session holds more than one. */
export function incomingMailMessage(
	emails: Pick<JMAPEmail, 'from' | 'subject' | 'threadId'>[],
	opts: { key: string; label: string; showAccount: boolean; unreadCount?: number }
): PushMessage {
	const account = opts.showAccount ? `account=${encodeURIComponent(opts.key)}` : '';
	const single = emails.length === 1 ? emails[0] : undefined;
	const params = [single?.threadId ? `thread=${encodeURIComponent(single.threadId)}` : '', account]
		.filter(Boolean)
		.join('&');
	const from = single?.from?.[0]?.name?.trim() || single?.from?.[0]?.email || 'Someone';
	return {
		title: opts.showAccount ? opts.label : 'New mail',
		body: single
			? `${from}: ${single.subject?.trim() || '(no subject)'}`
			: `${emails.length} new messages in Inbox`,
		url: params ? `/?${params}` : '/',
		tag: `zaur-new-mail-${opts.key}`,
		unreadCount: opts.unreadCount
	};
}

class PushWatcher {
	private started = false;
	private watchers = new Map<string, SubscriptionWatcher>();

	start(): void {
		if (this.started || !pushPublicKey()) return;
		this.started = true;
		this.sync();
	}

	/** Call after a subscription is added, changed or removed. */
	sync(): void {
		if (!this.started) return;
		const db = getStoreDb();
		prunePushSubscriptions(db, Date.now(), SUBSCRIPTION_MAX_AGE_MS);
		const rows = listPushSubscriptions(db);
		const live = new Set(rows.map((row) => row.id));
		for (const [id, watcher] of this.watchers) {
			if (live.has(id)) continue;
			watcher.stop();
			this.watchers.delete(id);
		}
		for (const row of rows) {
			const existing = this.watchers.get(row.id);
			if (existing) {
				existing.apply(row);
				continue;
			}
			const watcher = new SubscriptionWatcher(row, () => this.drop(row.id));
			this.watchers.set(row.id, watcher);
			watcher.start();
		}
	}

	stop(): void {
		for (const watcher of this.watchers.values()) watcher.stop();
		this.watchers.clear();
		this.started = false;
	}

	private drop(id: string): void {
		this.watchers.get(id)?.stop();
		this.watchers.delete(id);
	}
}

class SubscriptionWatcher {
	private stopped = false;
	private accounts = new Map<string, AccountWatcher>();
	private timer: ReturnType<typeof setInterval> | null = null;

	constructor(
		private row: PushSubscriptionRow,
		private onGone: () => void
	) {}

	start(): void {
		this.syncAccounts();
		this.timer = setInterval(() => this.syncAccounts(), ACCOUNT_RESYNC_MS);
	}

	apply(row: PushSubscriptionRow): void {
		this.row = row;
		this.syncAccounts();
	}

	private syncAccounts(): void {
		if (this.stopped) return;
		const accounts = readAccountsById(this.row.sessionId);
		if (accounts.length === 0) {
			// Signed out or expired: nobody is left to notify.
			deletePushSubscription(getStoreDb(), this.row.id);
			this.onGone();
			return;
		}
		const showAccount = accounts.length > 1;
		const muted = new Set(this.row.mutedAccounts);
		const wanted = new Map(
			accounts
				.filter((account) => !muted.has(accountKey(account.username)))
				.map((account) => [accountKey(account.username), account] as const)
		);
		for (const [key, watcher] of this.accounts) {
			if (wanted.has(key)) continue;
			watcher.stop();
			this.accounts.delete(key);
		}
		for (const [key, account] of wanted) {
			const existing = this.accounts.get(key);
			if (existing) {
				existing.update(this.row, showAccount);
				continue;
			}
			const watcher = new AccountWatcher(this.row, account, showAccount, this.onGone);
			this.accounts.set(key, watcher);
			void watcher.start();
		}
	}

	stop(): void {
		this.stopped = true;
		if (this.timer) clearInterval(this.timer);
		for (const watcher of this.accounts.values()) watcher.stop();
		this.accounts.clear();
	}
}

class AccountWatcher {
	private stopped = false;
	private emailState: string | undefined;
	private abort: AbortController | null = null;
	private poll: ReturnType<typeof setInterval> | null = null;
	private retry: ReturnType<typeof setTimeout> | null = null;
	private attempts = 0;
	private readonly key: string;
	private readonly label: string;

	constructor(
		private row: PushSubscriptionRow,
		private account: SessionData,
		private showAccount: boolean,
		private onGone: () => void
	) {
		this.key = accountKey(account.username);
		this.label = account.displayName?.trim() || account.username;
	}

	update(row: PushSubscriptionRow, showAccount: boolean): void {
		this.row = row;
		this.showAccount = showAccount;
	}

	async start(): Promise<void> {
		if (this.stopped) return;
		try {
			// createConnectedClient re-reads the session's newest tokens before use.
			const client = await createConnectedClient(this.account);
			const inbox = (await client.getMailboxes()).find((mailbox) => mailbox.role === 'inbox');
			if (!inbox) return;
			this.emailState = (await client.fetchSyncStates()).Email;
			if (client.getSession()?.eventSourceUrl) {
				void this.stream(client, inbox.id);
			} else {
				this.attempts = 0;
				this.poll = setInterval(() => void this.check(client, inbox.id), POLL_INTERVAL_MS);
			}
		} catch (cause) {
			console.warn('[push-watcher] could not watch', this.key, cause);
			this.scheduleRetry();
		}
	}

	stop(): void {
		this.stopped = true;
		this.abort?.abort();
		if (this.poll) clearInterval(this.poll);
		if (this.retry) clearTimeout(this.retry);
	}

	private scheduleRetry(): void {
		if (this.stopped) return;
		const delay = Math.min(RETRY_MAX_MS, RETRY_MIN_MS * 2 ** this.attempts++);
		this.retry = setTimeout(() => void this.start(), delay);
	}

	private async stream(client: JMAPClient, inboxId: string): Promise<void> {
		const opened = Date.now();
		try {
			this.abort = new AbortController();
			const response = await client.openEventStream();
			if (!response.ok || !response.body) throw new Error(`event stream ${response.status}`);
			const reader = response.body.getReader();
			this.abort.signal.addEventListener('abort', () => void reader.cancel().catch(() => {}));
			const decoder = new TextDecoder();
			let buffer = '';
			while (!this.stopped) {
				const { done, value } = await reader.read();
				if (done) break;
				buffer += decoder.decode(value, { stream: true });
				const events = buffer.split('\n\n');
				buffer = events.pop() ?? '';
				for (const event of events) {
					const data = event
						.split('\n')
						.find((line) => line.startsWith('data:'))
						?.slice(5)
						.trim();
					if (!data) continue;
					let payload: { '@type'?: string; changed?: Record<string, { Email?: string }> };
					try {
						payload = JSON.parse(data);
					} catch {
						continue;
					}
					const state = payload['@type'] === 'StateChange' ? payload.changed?.[client.getAccountId()]?.Email : undefined;
					if (state) await this.process(client, inboxId, state);
				}
			}
		} catch (cause) {
			if (!this.stopped) console.warn('[push-watcher] stream lost for', this.key, cause);
		}
		// A stream that held for a while was healthy: reconnect promptly. One that dies
		// on arrival keeps backing off, whichever step failed.
		if (Date.now() - opened > 60_000) this.attempts = 0;
		// Reconnect with a fresh client: its tokens may have rotated while streaming.
		this.scheduleRetry();
	}

	private async check(client: JMAPClient, inboxId: string): Promise<void> {
		try {
			const state = (await client.fetchSyncStates()).Email;
			if (state) await this.process(client, inboxId, state);
		} catch (cause) {
			console.warn('[push-watcher] poll failed for', this.key, cause);
		}
	}

	private async process(client: JMAPClient, inboxId: string, newState: string): Promise<void> {
		if (!this.emailState || newState === this.emailState) {
			this.emailState = newState;
			return;
		}
		const created: string[] = [];
		try {
			let since = this.emailState;
			for (;;) {
				const changes = await client.getEmailChanges(since);
				created.push(...changes.created);
				since = changes.newState;
				if (!changes.hasMoreChanges) break;
			}
			this.emailState = since;
		} catch (cause) {
			console.warn('[push-watcher] Email/changes failed for', this.key, cause);
			this.emailState = newState;
			return;
		}
		if (created.length === 0) return;

		const arrived = (await client.getEmailsByIds(created)).filter((email) => email.mailboxIds?.[inboxId]);
		// Categorise as mail lands rather than when a list is next opened, so the
		// chip and the label counts are right on first paint. Rules already ran.
		if (aiCategoriesOn(this.key)) categorizeInBackground(client, arrived);
		const incoming = arrived.filter((email) => !email.keywords?.$seen);
		if (incoming.length === 0) return;

		const unreadCount = (await client.getMailboxes().catch(() => [])).find((box) => box.id === inboxId)
			?.unreadEmails;
		const result = await sendPush(
			this.row,
			incomingMailMessage(incoming, {
				key: this.key,
				label: this.label,
				showAccount: this.showAccount,
				unreadCount
			})
		);
		if (result === 'gone') this.onGone();
	}
}

export const pushWatcher = new PushWatcher();
