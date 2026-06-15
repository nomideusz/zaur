import { browser } from '$app/environment';
import { settings } from '$lib/stores/settings.svelte';

export type ToastVariant = 'info' | 'success' | 'error';

export interface ToastAction {
	label: string;
	onClick: () => void | Promise<void>;
}

export interface Toast {
	id: string;
	message: string;
	variant: ToastVariant;
	action?: ToastAction;
	durationMs: number;
}

const AUTO_DISMISS_MS = 5_000;
export const UNDO_SEND_DELAY_MS = 8_000;
const UNDO_DISMISS_MS = UNDO_SEND_DELAY_MS;
const MAX_TOASTS = 2;

class ToastStore {
	toasts = $state<Toast[]>([]);

	private timers = new Map<string, ReturnType<typeof setTimeout>>();

	show(message: string, variant: ToastVariant = 'info') {
		this.showAction(message, variant);
	}

	showAction(
		message: string,
		variant: ToastVariant = 'info',
		action?: ToastAction,
		dismissMs = action ? UNDO_DISMISS_MS : AUTO_DISMISS_MS,
		options?: { force?: boolean }
	) {
		if (!browser) return;
		if (!options?.force && settings.hideActionToasts && variant !== 'error') return;

		const id = crypto.randomUUID();
		this.toasts = [{ id, message, variant, action, durationMs: dismissMs }, ...this.toasts].slice(
			0,
			MAX_TOASTS
		);

		const timer = setTimeout(() => this.dismiss(id), dismissMs);
		this.timers.set(id, timer);
	}

	showUndo(message: string, undo: () => void | Promise<void>, delayMs?: number) {
		if (!browser) return;
		const dismissMs = delayMs !== undefined ? delayMs : settings.undoSendDelay;
		this.showAction(message, 'success', { label: 'Undo', onClick: undo }, dismissMs, {
			force: true
		});
	}

	showMoveUndo(message: string, undo: () => void | Promise<void>) {
		if (!browser) return;
		const delayMs = settings.undoSendDelay;
		// Undo window turned off — just confirm the action, no Undo affordance.
		if (delayMs <= 0) {
			this.showAction(message, 'success');
			return;
		}
		this.showAction(message, 'success', { label: 'Undo', onClick: undo }, delayMs, {
			force: true
		});
	}

	async runAction(id: string, action: ToastAction) {
		this.dismiss(id);
		await action.onClick();
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
