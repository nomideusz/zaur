import { importantMarker } from '$lib/mail/important-marker.svelte';

export const IMPORTANT_MARKER_TOUCH_HOLD_MS = 320;
/** @deprecated Use IMPORTANT_MARKER_TOUCH_HOLD_MS */
export const IMPORTANT_RAINBOW_TOUCH_HOLD_MS = IMPORTANT_MARKER_TOUCH_HOLD_MS;

const MOVE_CANCEL_PX = 14;

export function createImportantMarkerTouchPick(options: {
	canPick: () => boolean;
	onCommitted?: () => void;
}) {
	let timer: ReturnType<typeof setTimeout> | null = null;
	let pending: { messageId: string; el: HTMLElement } | null = null;
	let active = false;
	let suppressClick = false;
	let startX = 0;
	let startY = 0;

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

	function releaseCapture(el: HTMLElement, pointerId?: number) {
		if (pointerId == null) return;
		try {
			if (el.hasPointerCapture(pointerId)) el.releasePointerCapture(pointerId);
		} catch {
			// capture may already be released
		}
	}

	function movedTooFar(event: PointerEvent): boolean {
		return (
			Math.hypot(event.clientX - startX, event.clientY - startY) > MOVE_CANCEL_PX
		);
	}

	return {
		onPointerDown(messageId: string, event: PointerEvent) {
			if (!options.canPick()) return;
			const el = event.currentTarget;
			if (!(el instanceof HTMLElement)) return;

			suppressClick = false;
			event.stopPropagation();
			clearTimer();
			startX = event.clientX;
			startY = event.clientY;
			pending = { messageId, el };
			active = false;
			try {
				el.setPointerCapture(event.pointerId);
			} catch {
				// Pointer capture may fail on some browsers for non-primary pointers.
			}
			timer = setTimeout(() => {
				if (!pending || pending.messageId !== messageId) return;
				active = true;
				suppressClick = true;
				importantMarker.startTouchPick(el, messageId);
				if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
					navigator.vibrate(10);
				}
			}, IMPORTANT_MARKER_TOUCH_HOLD_MS);
		},

		onPointerMove(event: PointerEvent) {
			if (!timer && !active) return;
			if (!movedTooFar(event)) return;
			if (active && pending) {
				importantMarker.cancelTouchPick(pending.el, pending.messageId);
			}
			reset();
		},

		onPointerUp(messageId: string, event: PointerEvent): boolean {
			const el = event.currentTarget;
			if (!(el instanceof HTMLElement)) return false;

			const wasActive = active && pending?.messageId === messageId;
			clearTimer();
			releaseCapture(el, event.pointerId);

			if (wasActive) {
				event.preventDefault();
				event.stopPropagation();
				suppressClick = true;
				importantMarker.finishTouchPick(el, messageId);
				options.onCommitted?.();
				reset();
				return true;
			}

			reset();
			return false;
		},

		onPointerCancel(event?: PointerEvent) {
			if (pending) releaseCapture(pending.el, event?.pointerId);
			if (active && pending) {
				importantMarker.cancelTouchPick(pending.el, pending.messageId);
			}
			reset();
		},

		consumeSuppressedClick(): boolean {
			if (!suppressClick) return false;
			suppressClick = false;
			return true;
		}
	};
}

/** @deprecated Use createImportantMarkerTouchPick */
export const createImportantRainbowTouchPick = createImportantMarkerTouchPick;
