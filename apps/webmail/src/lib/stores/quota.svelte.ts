import type { JMAPClient } from '$lib/jmap/client';

const REFRESH_TTL_MS = 5 * 60 * 1000;

/**
 * Shared mailbox storage quota, shown in the sidebar and settings.
 * 'unavailable' means the server does not expose the JMAP Quota extension.
 */
class QuotaStore {
	status = $state<'loading' | 'ready' | 'unavailable'>('loading');
	used = $state(0);
	limit = $state(0);

	percent = $derived(this.limit > 0 ? Math.min(100, Math.round((this.used / this.limit) * 100)) : 0);
	nearFull = $derived(this.percent >= 90);

	private accountId: string | null = null;
	private fetchedAt = 0;
	private inFlight: Promise<void> | null = null;

	/** Fetch the quota, deduped and cached per account for a few minutes. */
	load(client: JMAPClient, options?: { force?: boolean }): Promise<void> {
		const accountId = client.getAccountId();
		const fresh =
			this.accountId === accountId && Date.now() - this.fetchedAt < REFRESH_TTL_MS;
		if (fresh && !options?.force) return Promise.resolve();
		if (this.inFlight) return this.inFlight;

		if (this.accountId !== accountId) {
			this.status = 'loading';
			this.used = 0;
			this.limit = 0;
		}

		this.inFlight = (async () => {
			try {
				const quota = await client.getStorageQuota();
				this.accountId = accountId;
				this.fetchedAt = Date.now();
				if (!quota) {
					this.status = 'unavailable';
					return;
				}
				this.used = quota.used;
				this.limit = quota.limit;
				this.status = 'ready';
			} catch {
				if (this.status !== 'ready') this.status = 'unavailable';
			} finally {
				this.inFlight = null;
			}
		})();
		return this.inFlight;
	}
}

export const quota = new QuotaStore();
