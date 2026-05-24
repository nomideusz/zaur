import { browser } from '$app/environment';
import type { JMAPClient } from '$lib/jmap/client';
import { mail } from '$lib/stores/mail.svelte';
import { isStateTooOldError } from '$lib/utils/network';

type AccountChanges = { Email?: string; Mailbox?: string };

class SyncEngine {
	private syncing = false;

	async bootstrap(client: JMAPClient): Promise<void> {
		if (!browser) return;

		const { setSyncState } = await import('$lib/db');
		const accountId = client.getAccountId();
		const states = await client.fetchSyncStates();

		if (states.Email) await setSyncState(accountId, 'Email', states.Email);
		if (states.Mailbox) await setSyncState(accountId, 'Mailbox', states.Mailbox);
	}

	async handlePushChange(client: JMAPClient, changes: AccountChanges): Promise<void> {
		if (!browser || this.syncing) return;

		this.syncing = true;
		try {
			if (changes.Mailbox) {
				await this.syncMailbox(client, changes.Mailbox);
			}
			if (changes.Email) {
				await this.syncEmail(client, changes.Email);
			}
		} finally {
			this.syncing = false;
		}
	}

	private async syncMailbox(client: JMAPClient, newState: string): Promise<void> {
		const { getSyncState, setSyncState } = await import('$lib/db');
		const accountId = client.getAccountId();
		const sinceState = await getSyncState(accountId, 'Mailbox');

		if (!sinceState) {
			await mail.loadMailboxes(client);
			await setSyncState(accountId, 'Mailbox', newState);
			return;
		}

		try {
			let currentSince = sinceState;
			let hasMore = true;

			while (hasMore) {
				const result = await client.getMailboxChanges(currentSince);
				hasMore = result.hasMoreChanges;
				currentSince = result.newState;
			}

			await mail.loadMailboxes(client);
			await setSyncState(accountId, 'Mailbox', newState);
		} catch (error) {
			if (isStateTooOldError(error)) {
				await mail.loadMailboxes(client);
				await setSyncState(accountId, 'Mailbox', newState);
				return;
			}
			throw error;
		}
	}

	private async syncEmail(client: JMAPClient, newState: string): Promise<void> {
		const { getSyncState, setSyncState } = await import('$lib/db');
		const accountId = client.getAccountId();
		const sinceState = await getSyncState(accountId, 'Email');

		if (!sinceState) {
			await this.fallbackEmailRefresh(client, newState);
			return;
		}

		try {
			const created: string[] = [];
			const updated: string[] = [];
			const destroyed: string[] = [];
			let currentSince = sinceState;
			let hasMore = true;
			let latestState = newState;

			while (hasMore) {
				const result = await client.getEmailChanges(currentSince);
				created.push(...result.created);
				updated.push(...result.updated);
				destroyed.push(...result.destroyed);
				currentSince = result.newState;
				latestState = result.newState;
				hasMore = result.hasMoreChanges;
			}

			const changedIds = [...new Set([...created, ...updated])];
			const emails = changedIds.length ? await client.getEmailsByIds(changedIds) : [];

			await mail.applyEmailSync(client, emails, destroyed);
			await setSyncState(accountId, 'Email', latestState);
		} catch (error) {
			if (isStateTooOldError(error)) {
				await this.fallbackEmailRefresh(client, newState);
				return;
			}
			throw error;
		}
	}

	private async fallbackEmailRefresh(client: JMAPClient, newState: string): Promise<void> {
		const { setSyncState } = await import('$lib/db');
		const accountId = client.getAccountId();
		const routeId = mail.currentMailboxRouteId;

		if (routeId) {
			await mail.refreshMessages(client, routeId);
		}

		const threadId = mail.selectedThreadId;
		if (threadId && routeId) {
			try {
				const emails = await client.getThreadEmails(threadId);
				mail.setSelectedThread(emails, routeId);
			} catch {
				// Background refresh — ignore transient errors
			}
		}

		await setSyncState(accountId, 'Email', newState);
	}
}

export const syncEngine = new SyncEngine();
