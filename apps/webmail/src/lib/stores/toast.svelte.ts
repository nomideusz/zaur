import { browser } from '$app/environment';
import { createToaster } from '@ark-ui/svelte/toast';
import { settings } from '$lib/stores/settings.svelte';

export type ToastVariant = 'info' | 'success' | 'error';

export interface ToastAction {
	label: string;
	onClick: () => void | Promise<void>;
}

const AUTO_DISMISS_MS = 5_000;
export const UNDO_SEND_DELAY_MS = 8_000;
const UNDO_DISMISS_MS = UNDO_SEND_DELAY_MS;
const MAX_TOASTS = 2;

// Single module-scope toaster shared by the store (below) and ToastStack.svelte.
// Bottom-centre, vertical stack (no overlap) to preserve the "status line" look.
// `--z-toast-bottom` is defined responsively in status-line.css so the inline
// offset picks up the floating-island clearance on phones.
export const toaster = createToaster({
	placement: 'bottom',
	overlap: false,
	gap: 6,
	max: MAX_TOASTS,
	offsets: {
		top: '1rem',
		bottom: 'var(--z-toast-bottom, 0.75rem)',
		left: '1rem',
		right: '1rem'
	}
});

class ToastStore {
	show(message: string, variant: ToastVariant = 'info') {
		this.showAction(message, variant);
	}

	showAction(
		message: string,
		variant: ToastVariant = 'info',
		action?: ToastAction,
		dismissMs = action ? UNDO_DISMISS_MS : AUTO_DISMISS_MS,
		options?: { force?: boolean }
	): string | undefined {
		if (!browser) return;
		if (!options?.force && settings.hideActionToasts && variant !== 'error') return;

		// Ark's ActionTrigger runs the action's onClick and dismisses the toast for us,
		// so the previous runAction() dismiss-then-run dance is no longer needed.
		return toaster.create({
			title: message,
			type: variant,
			duration: dismissMs,
			action: action ? { label: action.label, onClick: () => void action.onClick() } : undefined
		});
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

	dismiss(id: string) {
		toaster.dismiss(id);
	}

	reset() {
		toaster.dismiss();
	}
}

export const toast = new ToastStore();
