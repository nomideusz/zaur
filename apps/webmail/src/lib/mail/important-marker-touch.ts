import { importantMarker } from '$lib/mail/important-marker.svelte';
import { haptic } from '$lib/utils/haptics';

export const IMPORTANT_MARKER_TOUCH_HOLD_MS = 320;
/** @deprecated Use IMPORTANT_MARKER_TOUCH_HOLD_MS */
export const IMPORTANT_RAINBOW_TOUCH_HOLD_MS = IMPORTANT_MARKER_TOUCH_HOLD_MS;

/** Before activation, any real movement is a scroll — bail out. */
const PRE_ACTIVATION_CANCEL_PX = 10;
/** After activation, a clearly vertical pull abandons the pick. */
const VERTICAL_CANCEL_PX = 18;
/** Scrub gearing — a comfortable thumb sweep (~170px) covers the full 60° palette. */
const SCRUB_DEG_PER_PX = 0.35;
/** Horizontal travel that switches from hold-to-cycle to drag-to-scrub. */
const SCRUB_START_PX = 6;

/**
 * Touch color pick for Highlighted subjects:
 * hold ≥320ms to activate (haptic tick, hues start cycling slowly), then
 * either keep holding to browse, or drag sideways to scrub the hue directly
 * like a slider. Release commits; a vertical pull cancels.
 *
 * Coordinates are tracked from pointerdown — `event.movementX/Y` is
 * unreliable for touch pointers on iOS Safari.
 */
export function createImportantMarkerTouchPick(options: {
	canPick: () => boolean;
	onCommitted?: () => void;
}) {
	let timer: ReturnType<typeof setTimeout> | null = null;
	let pending: {
		messageId: string;
		el: HTMLElement;
		startX: number;
		startY: number;
		startShift: number;
	} | null = null;
	let active = false;
	let scrubbing = false;
	let scrubFrame = 0;
	let scrubShift = 0;

	function clearTimer() {
		if (timer) {
			clearTimeout(timer);
			timer = null;
		}
	}

	function reset() {
		clearTimer();
		if (scrubFrame) {
			cancelAnimationFrame(scrubFrame);
			scrubFrame = 0;
		}
		pending = null;
		active = false;
		scrubbing = false;
	}

	function releaseCapture(el: HTMLElement, pointerId?: number) {
		if (pointerId == null) return;
		try {
			if (el.hasPointerCapture(pointerId)) el.releasePointerCapture(pointerId);
		} catch {
			// capture may already be released
		}
	}

	function queueScrub(messageId: string, shift: number) {
		scrubShift = shift;
		if (scrubFrame) return;
		scrubFrame = requestAnimationFrame(() => {
			scrubFrame = 0;
			if (active && pending?.messageId === messageId) {
				importantMarker.scrubTouchPick(messageId, scrubShift);
			}
		});
	}

	return {
		onPointerDown(messageId: string, event: PointerEvent) {
			if (!options.canPick()) return;
			const el = event.currentTarget;
			if (!(el instanceof HTMLElement)) return;

			event.stopPropagation();
			reset();
			pending = {
				messageId,
				el,
				startX: event.clientX,
				startY: event.clientY,
				startShift: importantMarker.pickFor(messageId).hueShift
			};
			try {
				el.setPointerCapture(event.pointerId);
			} catch {
				// Pointer capture may fail on some browsers for non-primary pointers.
			}
			timer = setTimeout(() => {
				if (!pending || pending.messageId !== messageId) return;
				active = true;
				haptic(10);
				importantMarker.startTouchPick(el, messageId);
			}, IMPORTANT_MARKER_TOUCH_HOLD_MS);
		},

		onPointerMove(event: PointerEvent) {
			if (!pending) return;
			const dx = event.clientX - pending.startX;
			const dy = event.clientY - pending.startY;

			if (!active) {
				/* Still waiting for the hold — movement means the user is scrolling. */
				if (Math.abs(dx) > PRE_ACTIVATION_CANCEL_PX || Math.abs(dy) > PRE_ACTIVATION_CANCEL_PX) {
					reset();
				}
				return;
			}

			if (!scrubbing && Math.abs(dy) > VERTICAL_CANCEL_PX && Math.abs(dy) > Math.abs(dx)) {
				importantMarker.cancelTouchPick(pending.el, pending.messageId);
				reset();
				return;
			}

			if (scrubbing || Math.abs(dx) > SCRUB_START_PX) {
				scrubbing = true;
				event.preventDefault();
				queueScrub(pending.messageId, pending.startShift + dx * SCRUB_DEG_PER_PX);
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
