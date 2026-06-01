import { importantRainbow } from '$lib/mail/important-rainbow.svelte';

export const IMPORTANT_RAINBOW_TOUCH_HOLD_MS = 320;
const MOVE_CANCEL_PX = 10;

export function createImportantRainbowTouchPick(options: {
	canPick: () => boolean;
	onCommitted?: () => void;
}) {
	let timer: ReturnType<typeof setTimeout> | null = null;
	let pending: { messageId: string; el: HTMLElement } | null = null;
	let active = false;

	function clearTimer() {
		if (timer) {
			clearTimeout(timer);
			timer = null;
		}
	}

	function reset() {
		clearTimer();
		pending = null;
		active = false;
	}

	return {
		onPointerDown(messageId: string, event: PointerEvent) {
			if (!options.canPick()) return;
			const el = event.currentTarget;
			if (!(el instanceof HTMLElement)) return;

			event.stopPropagation();
			clearTimer();
			pending = { messageId, el };
			active = false;
			timer = setTimeout(() => {
				if (!pending || pending.messageId !== messageId) return;
				active = true;
				importantRainbow.startTouchPick(el, messageId);
			}, IMPORTANT_RAINBOW_TOUCH_HOLD_MS);
		},

		onPointerMove(event: PointerEvent) {
			if (!timer && !active) return;
			if (
				Math.abs(event.movementX) > MOVE_CANCEL_PX ||
				Math.abs(event.movementY) > MOVE_CANCEL_PX
			) {
				if (active && pending) {
					importantRainbow.cancelTouchPick(pending.el, pending.messageId);
				}
				reset();
			}
		},

		onPointerUp(messageId: string, event: PointerEvent) {
			const el = event.currentTarget;
			if (!(el instanceof HTMLElement)) return;

			const wasActive = active && pending?.messageId === messageId;
			clearTimer();

			if (wasActive) {
				event.preventDefault();
				event.stopPropagation();
				importantRainbow.finishTouchPick(el, messageId);
				options.onCommitted?.();
			}

			reset();
		},

		onPointerCancel() {
			if (active && pending) {
				importantRainbow.cancelTouchPick(pending.el, pending.messageId);
			}
			reset();
		}
	};
}
