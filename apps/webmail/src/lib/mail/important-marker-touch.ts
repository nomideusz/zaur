import { importantMarker } from '$lib/mail/important-marker.svelte';

export const IMPORTANT_MARKER_TOUCH_HOLD_MS = 320;
/** @deprecated Use IMPORTANT_MARKER_TOUCH_HOLD_MS */
export const IMPORTANT_RAINBOW_TOUCH_HOLD_MS = IMPORTANT_MARKER_TOUCH_HOLD_MS;

const MOVE_CANCEL_PX = 10;

export function createImportantMarkerTouchPick(options: {
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

	function releaseCapture(el: HTMLElement, pointerId?: number) {
		if (pointerId == null) return;
		try {
			if (el.hasPointerCapture(pointerId)) el.releasePointerCapture(pointerId);
		} catch {
			// capture may already be released
		}
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
			try {
				el.setPointerCapture(event.pointerId);
			} catch {
				// Pointer capture may fail on some browsers for non-primary pointers.
			}
			timer = setTimeout(() => {
				if (!pending || pending.messageId !== messageId) return;
				active = true;
				importantMarker.startTouchPick(el, messageId);
			}, IMPORTANT_MARKER_TOUCH_HOLD_MS);
		},

		onPointerMove(event: PointerEvent) {
			if (!timer && !active) return;
			if (
				Math.abs(event.movementX) > MOVE_CANCEL_PX ||
				Math.abs(event.movementY) > MOVE_CANCEL_PX
			) {
				if (active && pending) {
					importantMarker.cancelTouchPick(pending.el, pending.messageId);
				}
				reset();
			}
		},

		onPointerUp(messageId: string, event: PointerEvent) {
			const el = event.currentTarget;
			if (!(el instanceof HTMLElement)) return;

			const wasActive = active && pending?.messageId === messageId;
			clearTimer();
			releaseCapture(el, event.pointerId);

			if (wasActive) {
				event.preventDefault();
				event.stopPropagation();
				importantMarker.finishTouchPick(el, messageId);
				options.onCommitted?.();
			}

			reset();
		},

		onPointerCancel(event?: PointerEvent) {
			if (pending) releaseCapture(pending.el, event?.pointerId);
			if (active && pending) {
				importantMarker.cancelTouchPick(pending.el, pending.messageId);
			}
			reset();
		}
	};
}

/** @deprecated Use createImportantMarkerTouchPick */
export const createImportantRainbowTouchPick = createImportantMarkerTouchPick;
