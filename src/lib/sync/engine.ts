import { browser } from '$app/environment';
import type { JMAPClient } from '$lib/jmap/client';
import { mail } from '$lib/stores/mail.svelte';
import { isStateTooOldError } from '$lib/utils/network';

type AccountChanges = { Email?: string; Mailbox?: string };

class SyncEngine {
	private syncing = false;
	private pendingChanges: AccountChanges | null = null;

	async bootstrap(client: JMAPClient): Promise<void> {
		if (!browser) return;

		const { setSyncState } = await import('$lib/db');
		const accountId = client.getAccountId();
		const states = await client.fetchSyncStates();

		if (states.Email) await setSyncState(accountId, 'Email', states.Email);
		if (states.Mailbox) await setSyncState(accountId, 'Mailbox', states.Mailbox);
	}

	async handlePushChange(client: JMAPClient, changes: AccountChanges): Promise<void> {
		if (!browser) return;

		this.pendingChanges = this.mergeChanges(this.pendingChanges, changes);
		if (this.syncing) return;

		this.syncing = true;
		try {
			while (this.pendingChanges) {
				const batch = this.pendingChanges;
				this.pendingChanges = null;

				if (batch.Mailbox) {
					await this.syncMailbox(client, batch.Mailbox);
				}
				if (batch.Email) {
					await this.syncEmail(client, batch.Email);
				}
			}
		} finally {
			this.syncing = false;
		}
	}

	private mergeChanges(
		existing: AccountChanges | null,
		incoming: AccountChanges
	): AccountChanges {
		if (!existing) return { ...incoming };
		return {
			Mailbox: incoming.Mailbox ?? existing.Mailbox,
			Email: incoming.Email ?? existing.Email
		};
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
			const created: string[] = [];
			const updated: string[] = [];
			const destroyed: string[] = [];
			let currentSince = sinceState;
			let hasMore = true;
			let latestState = newState;

			while (hasMore) {
				const result = await client.getMailboxChanges(currentSince);
				created.push(...result.created);
				updated.push(...result.updated);
				destroyed.push(...result.destroyed);
				currentSince = result.newState;
				latestState = result.newState;
				hasMore = result.hasMoreChanges;
			}

			const changedIds = [...new Set([...created, ...updated])];
			const mailboxes = changedIds.length ? await client.getMailboxesByIds(changedIds) : [];

			mail.applyMailboxSync(mailboxes, destroyed);
			await setSyncState(accountId, 'Mailbox', latestState);
		} catch (error) {
			if (isStateTooOldError(error)) {
				await mail.refreshMailboxes(client);
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
			mail.notifyNewMail(created, emails);
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
