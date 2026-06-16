import { importantMarker } from '$lib/mail/important-marker.svelte';
import { haptic } from '$lib/utils/haptics';

export const IMPORTANT_MARKER_TOUCH_HOLD_MS = 320;
/** @deprecated Use IMPORTANT_MARKER_TOUCH_HOLD_MS */
export const IMPORTANT_RAINBOW_TOUCH_HOLD_MS = IMPORTANT_MARKER_TOUCH_HOLD_MS;

/** In the list, a stationary hold belongs to bulk selection, not the picker. */
export const IMPORTANT_MARKER_SELECT_HOLD_MS = 420;

/** Before activation, any real movement is a scroll — bail out. */
const PRE_ACTIVATION_CANCEL_PX = 10;
/** After activation, a clearly vertical pull abandons the pick. */
const VERTICAL_CANCEL_PX = 18;
/** Scrub gearing — a comfortable thumb sweep (~300px) covers the full colour wheel. */
const SCRUB_DEG_PER_PX = 1.2;
/** Horizontal travel that switches from hold-to-cycle to drag-to-scrub. */
const SCRUB_START_PX = 6;

/**
 * Touch color pick for Highlighted subjects.
 *
 * Two activation models, picked by whether `onSelect` is supplied:
 *
 * - **Reader (no `onSelect`):** hold ≥320ms to activate (haptic tick, hues
 *   start cycling), then keep holding to browse or drag sideways to scrub.
 *
 * - **List (`onSelect` supplied):** a stationary hold is reserved for bulk
 *   selection — it fires `onSelect` (so long-pressing a highlighted subject
 *   enters/joins selection like any other row), while the colour picker engages
 *   on a sideways drag (press-and-scrub, like a slider). A vertical drag is a
 *   scroll and abandons the gesture.
 *
 * Either way release commits a pick; a vertical pull cancels one.
 *
 * Coordinates are tracked from pointerdown — `event.movementX/Y` is
 * unreliable for touch pointers on iOS Safari.
 */
export function createImportantMarkerTouchPick(options: {
	canPick: () => boolean;
	onCommitted?: () => void;
	/**
	 * When supplied, a stationary hold enters this callback (bulk selection)
	 * instead of the colour picker; the picker then activates on a sideways
	 * drag. Without it, the picker activates on hold (reader behaviour).
	 */
	onSelect?: (messageId: string) => void;
}) {
	const selectMode = !!options.onSelect;
	let timer: ReturnType<typeof setTimeout> | null = null;
	let pending: {
		messageId: string;
		el: HTMLElement;
		pointerId: number;
		startX: number;
		startY: number;
		startShift: number;
	} | null = null;
	let active = false;
	let scrubbing = false;
	let scrubFrame = 0;
	let scrubShift = 0;
	/** Swallow the click that follows a hold-to-select so it doesn't re-toggle. */
	let suppressClick = false;

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

	/** Engage the colour picker on a sideways drag and start scrubbing. */
	function activateScrub(dx: number) {
		if (!pending) return;
		clearTimer();
		active = true;
		scrubbing = true;
		haptic(10);
		importantMarker.startTouchPick(pending.el, pending.messageId);
		queueScrub(pending.messageId, pending.startShift + dx * SCRUB_DEG_PER_PX);
	}

	return {
		onPointerDown(messageId: string, event: PointerEvent) {
			if (!options.canPick()) return;
			const el = event.currentTarget;
			if (!(el instanceof HTMLElement)) return;

			event.stopPropagation();
			reset();
			suppressClick = false;
			pending = {
				messageId,
				el,
				pointerId: event.pointerId,
				startX: event.clientX,
				startY: event.clientY,
				startShift: importantMarker.pickFor(messageId).hueShift
			};
			try {
				el.setPointerCapture(event.pointerId);
			} catch {
				// Pointer capture may fail on some browsers for non-primary pointers.
			}

			if (selectMode) {
				/* Stationary hold → bulk selection; the picker waits for a drag. */
				timer = setTimeout(() => {
					if (!pending || pending.messageId !== messageId || active) return;
					haptic(12);
					releaseCapture(el, pending.pointerId);
					suppressClick = true;
					options.onSelect?.(messageId);
					reset();
				}, IMPORTANT_MARKER_SELECT_HOLD_MS);
			} else {
				timer = setTimeout(() => {
					if (!pending || pending.messageId !== messageId) return;
					active = true;
					haptic(10);
					importantMarker.startTouchPick(el, messageId);
				}, IMPORTANT_MARKER_TOUCH_HOLD_MS);
			}
		},

		onPointerMove(event: PointerEvent) {
			if (!pending) return;
			const dx = event.clientX - pending.startX;
			const dy = event.clientY - pending.startY;

			if (!active) {
				if (selectMode) {
					/* A sideways drag is a recolour; a vertical drag is a scroll. A
					   small/stationary touch keeps waiting for the selection hold. */
					if (Math.abs(dx) > SCRUB_START_PX && Math.abs(dx) >= Math.abs(dy)) {
						event.preventDefault();
						activateScrub(dx);
						return;
					}
					if (Math.abs(dy) > PRE_ACTIVATION_CANCEL_PX && Math.abs(dy) > Math.abs(dx)) {
						releaseCapture(pending.el, pending.pointerId);
						reset();
					}
					return;
				}

				/* Reader: still waiting for the hold — movement means scrolling. */
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
		},

		/** Wire to the subject's `onclickcapture` to drop the post-hold click. */
		onClickCapture(event: MouseEvent) {
			if (!suppressClick) return;
			suppressClick = false;
			event.preventDefault();
			event.stopPropagation();
		}
	};
}

/** @deprecated Use createImportantMarkerTouchPick */
export const createImportantRainbowTouchPick = createImportantMarkerTouchPick;
