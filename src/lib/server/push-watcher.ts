import type { JMAPEmail } from '$lib/jmap/types';
import { createConnectedClient } from '$lib/server/jmap';
import { sendPushNotification } from '$lib/server/push-sender';
import { isPushConfigured } from '$lib/server/push-config';
import {
	listPushSubscriptions,
	removePushSubscription,
	updatePushSubscriptionState,
	type StoredPushSubscription
} from '$lib/server/push-subscriptions';
import { readSessionById, unsealSession } from '$lib/server/session';

const RECONNECT_DELAY_MS = 5_000;
const POLL_INTERVAL_MS = 30_000;

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

class SubscriptionWatcher {
	private stopped = false;
	private pollTimer: ReturnType<typeof setInterval> | null = null;
	private streamAbort: AbortController | null = null;

	constructor(
		private record: StoredPushSubscription,
		private onInvalid: () => void
	) {}

	async start(): Promise<void> {
		const session = readSessionById(this.record.sessionId) ?? unsealSession(this.record.sessionToken ?? '');
		if (!session) {
			await removePushSubscription(this.record.id);
			this.onInvalid();
			return;
		}

		try {
			const client = await createConnectedClient(session);
			const mailboxes = await client.getMailboxes();
			const inbox = mailboxes.find((mailbox) => mailbox.role === 'inbox');
			if (!inbox) {
				await removePushSubscription(this.record.id);
				this.onInvalid();
				return;
			}

			const states = await client.fetchSyncStates();
			await updatePushSubscriptionState(this.record.id, {
				inboxMailboxId: inbox.id,
				emailState: this.record.emailState ?? states.Email
			});

			this.record = {
				...this.record,
				inboxMailboxId: inbox.id,
				emailState: this.record.emailState ?? states.Email
			};

			if (client.getSession()?.eventSourceUrl) {
				void this.watchEventStream(client, inbox.id);
			} else {
				this.startPolling(client, inbox.id);
			}
		} catch (error) {
			console.warn('[push-watcher] Failed to start watcher:', error);
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

	private startPolling(client: Awaited<ReturnType<typeof createConnectedClient>>, inboxId: string) {
		this.pollTimer = setInterval(() => {
			void this.checkForNewMail(client, inboxId);
		}, POLL_INTERVAL_MS);
		void this.checkForNewMail(client, inboxId);
	}

	private async watchEventStream(
		client: Awaited<ReturnType<typeof createConnectedClient>>,
		inboxId: string
	) {
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
					console.warn('[push-watcher] Event stream disconnected:', error);
				}
			} finally {
				this.streamAbort = null;
			}

			if (!this.stopped) {
				await new Promise((resolve) => setTimeout(resolve, RECONNECT_DELAY_MS));
			}
		}
	}

	private async checkForNewMail(
		client: Awaited<ReturnType<typeof createConnectedClient>>,
		inboxId: string
	) {
		if (this.stopped || !this.record.emailState) return;

		try {
			const states = await client.fetchSyncStates();
			const nextState = states.Email;
			if (!nextState || nextState === this.record.emailState) return;
			await this.processEmailState(client, inboxId, nextState);
		} catch (error) {
			console.warn('[push-watcher] Poll failed:', error);
		}
	}

	private async processEmailState(
		client: Awaited<ReturnType<typeof createConnectedClient>>,
		inboxId: string,
		newState: string
	) {
		if (!this.record.emailState || newState === this.record.emailState) {
			this.record.emailState = newState;
			await updatePushSubscriptionState(this.record.id, { emailState: newState });
			return;
		}

		let sinceState = this.record.emailState;
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
			console.warn('[push-watcher] Email/changes failed:', error);
			this.record.emailState = newState;
			await updatePushSubscriptionState(this.record.id, { emailState: newState });
			return;
		}

		this.record.emailState = latestState;
		await updatePushSubscriptionState(this.record.id, { emailState: latestState });

		if (!created.length) return;

		const emails = await client.getEmailsByIds(created);
		const incoming = emails.filter(
			(email) => email.mailboxIds?.[inboxId] && !email.keywords?.$seen
		);
		if (!incoming.length) return;

		await this.notifyIncomingMail(client, inboxId, incoming);
	}

	private async getInboxUnreadCount(
		client: Awaited<ReturnType<typeof createConnectedClient>>,
		inboxId: string
	): Promise<number | undefined> {
		try {
			const mailboxes = await client.getMailboxes();
			const inbox = mailboxes.find((mailbox) => mailbox.id === inboxId);
			return inbox?.unreadEmails;
		} catch {
			return undefined;
		}
	}

	private async notifyIncomingMail(
		client: Awaited<ReturnType<typeof createConnectedClient>>,
		inboxId: string,
		emails: JMAPEmail[]
	) {
		const unreadCount = await this.getInboxUnreadCount(client, inboxId);

		if (emails.length === 1) {
			const email = emails[0];
			const from = email.from?.[0]?.name?.trim() || email.from?.[0]?.email || 'Someone';
			const subject = email.subject?.trim() || '(no subject)';
			await sendPushNotification(this.record, {
				title: 'New mail',
				body: `${from}: ${subject}`,
				url: email.threadId ? `/mail/inbox/${email.threadId}` : '/mail/inbox',
				unreadCount
			});
			return;
		}

		await sendPushNotification(this.record, {
			title: 'New mail',
			body: `${emails.length} new messages in Inbox`,
			unreadCount
		});
	}
}

export const pushWatcher = new PushWatcher();
