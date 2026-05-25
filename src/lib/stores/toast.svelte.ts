import { browser } from '$app/environment';
import { settings } from '$lib/stores/settings.svelte';

export type ToastVariant = 'info' | 'success' | 'error';

export interface Toast {
	id: string;
	message: string;
	variant: ToastVariant;
}

const AUTO_DISMISS_MS = 5_000;
const MAX_TOASTS = 4;

class ToastStore {
	toasts = $state<Toast[]>([]);

	private timers = new Map<string, ReturnType<typeof setTimeout>>();

	show(message: string, variant: ToastVariant = 'info') {
		if (!browser) return;
		if (settings.hideActionToasts && variant !== 'error') return;

		const id = crypto.randomUUID();
		this.toasts = [{ id, message, variant }, ...this.toasts].slice(0, MAX_TOASTS);

		const timer = setTimeout(() => this.dismiss(id), AUTO_DISMISS_MS);
		this.timers.set(id, timer);
	}

	dismiss(id: string) {
		const timer = this.timers.get(id);
		if (timer) {
			clearTimeout(timer);
			this.timers.delete(id);
		}
		this.toasts = this.toasts.filter((toast) => toast.id !== id);
	}

	reset() {
		for (const timer of this.timers.values()) {
			clearTimeout(timer);
		}
		this.timers.clear();
		this.toasts = [];
	}
}

export const toast = new ToastStore();
