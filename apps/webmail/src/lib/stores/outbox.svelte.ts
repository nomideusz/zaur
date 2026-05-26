import { browser } from '$app/environment';
import type { OutboxDoc } from '$lib/db/types';

const POLL_MS = 5_000;

class OutboxStore {
	items = $state<OutboxDoc[]>([]);
	pendingCount = $state(0);
	isRefreshing = $state(false);

	private interval: ReturnType<typeof setInterval> | null = null;

	start() {
		if (!browser) return;
		this.stop();
		void this.refresh();
		this.interval = setInterval(() => {
			void this.refresh();
		}, POLL_MS);
	}

	stop() {
		if (this.interval) {
			clearInterval(this.interval);
			this.interval = null;
		}
		this.items = [];
		this.pendingCount = 0;
	}

	async refresh() {
		if (!browser || this.isRefreshing) return;

		const { getAccountId, listOutboxItems } = await import('$lib/db');
		const accountId = getAccountId();
		if (!accountId) {
			this.items = [];
			this.pendingCount = 0;
			return;
		}

		this.isRefreshing = true;
		try {
			const items = await listOutboxItems(accountId);
			this.items = items;
			this.pendingCount = items.length;
		} finally {
			this.isRefreshing = false;
		}
	}

	async discard(id: string) {
		const { removeOutboxItem } = await import('$lib/db');
		await removeOutboxItem(id);
		await this.refresh();
	}

	async retry(id: string) {
		const { retryOutboxItem } = await import('$lib/db');
		await retryOutboxItem(id);
		await this.refresh();
		void import('$lib/sync/outbox-processor').then(({ outboxProcessor }) =>
			outboxProcessor.processQueue()
		);
	}

	reset() {
		this.stop();
	}
}

export const outbox = new OutboxStore();
