import { browser } from '$app/environment';
import { toast } from '$lib/stores/toast.svelte';

class NetworkStore {
	isOnline = $state(true);

	private onlineHandler: (() => void) | null = null;
	private offlineHandler: (() => void) | null = null;
	private onReconnect: (() => void) | null = null;

	init(onReconnect?: () => void) {
		if (!browser) return;

		this.onReconnect = onReconnect ?? null;
		this.isOnline = navigator.onLine;

		this.onlineHandler = () => {
			const wasOffline = !this.isOnline;
			this.isOnline = true;
			if (wasOffline) {
				toast.show('Back online', 'success');
				this.onReconnect?.();
			}
		};

		this.offlineHandler = () => {
			this.isOnline = false;
		};

		window.addEventListener('online', this.onlineHandler);
		window.addEventListener('offline', this.offlineHandler);
	}

	stop() {
		if (!browser) return;

		if (this.onlineHandler) {
			window.removeEventListener('online', this.onlineHandler);
			this.onlineHandler = null;
		}
		if (this.offlineHandler) {
			window.removeEventListener('offline', this.offlineHandler);
			this.offlineHandler = null;
		}
		this.onReconnect = null;
	}
}

export const network = new NetworkStore();
