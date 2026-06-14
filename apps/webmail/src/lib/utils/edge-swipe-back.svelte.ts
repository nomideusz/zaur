import { haptic } from '$lib/utils/haptics';
import { isCoarsePointer } from '$lib/utils/pointer-env';

/* Gesture must begin within this many px of the left screen edge. */
const EDGE_PX = 24;
/* Commit when horizontal travel passes this fraction of the viewport… */
const TRIGGER_RATIO = 0.32;
/* …capped so it stays reachable on large phones. */
const TRIGGER_MAX_PX = 140;
/* Dampened visual peek while dragging — acknowledges the gesture without a
   large jump when the commit hands off to the view transition. */
const PEEK_MAX_PX = 40;
const PEEK_DAMP = 0.4;
/* The drag must be clearly horizontal, else it's a vertical scroll. */
const AXIS_DOMINANCE = 1.4;

interface EdgeSwipeBackOptions {
	onBack: () => void;
	/** Gate per gesture — e.g. only on the mobile layout. */
	canSwipe?: () => boolean;
}

/**
 * Left-edge swipe-to-go-back for leaf screens. Installed iOS PWAs have no
 * system back gesture, so this is the resilient fallback to the floating
 * island. touchstart/move stay passive so the gesture never blocks scrolling;
 * it only acts on a horizontally-dominant drag that begins at the very left
 * edge. On release it cancels the synthesized click so the back navigation
 * fires exactly once.
 */
export function createEdgeSwipeBack(options: EdgeSwipeBackOptions) {
	let peek = $state(0);
	/** True between release and settle — gates the snap-back transition. */
	let releasing = $state(false);

	let startX = 0;
	let startY = 0;
	let tracking = false;
	let active = false;
	let armed = false;
	let width = 1;

	function allowed(): boolean {
		if (!isCoarsePointer()) return false;
		return options.canSwipe?.() ?? true;
	}

	function reset() {
		tracking = false;
		active = false;
		armed = false;
		peek = 0;
	}

	function onTouchStart(event: TouchEvent) {
		if (event.touches.length !== 1 || !allowed()) return;
		const touch = event.touches[0];
		if (touch.clientX > EDGE_PX) return;
		startX = touch.clientX;
		startY = touch.clientY;
		width = window.innerWidth || 1;
		tracking = true;
		active = false;
		armed = false;
		releasing = false;
	}

	function onTouchMove(event: TouchEvent) {
		if (!tracking) return;
		const touch = event.touches[0];
		const dx = touch.clientX - startX;
		const dy = touch.clientY - startY;

		if (!active) {
			if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
			/* Rightward and clearly horizontal, or hand the gesture back. */
			if (dx > 0 && dx > Math.abs(dy) * AXIS_DOMINANCE) {
				active = true;
			} else {
				reset();
				return;
			}
		}

		if (dx <= 0) {
			peek = 0;
			armed = false;
			return;
		}
		peek = Math.min(dx * PEEK_DAMP, PEEK_MAX_PX);
		const threshold = Math.min(width * TRIGGER_RATIO, TRIGGER_MAX_PX);
		const next = dx >= threshold;
		if (next !== armed) {
			armed = next;
			if (armed) haptic(10);
		}
	}

	function onTouchEnd(event?: TouchEvent) {
		if (!tracking) return;
		const wasActive = active;
		const commit = active && armed;
		tracking = false;
		active = false;
		armed = false;
		/* A recognised edge-swipe must not also fire the browser's synthesized
		   click — it would land on the freshly-rendered list and navigate again
		   (the double back animation). preventDefault on touchend suppresses the
		   click without affecting scrolling. */
		if (wasActive && event?.cancelable) event.preventDefault();
		if (commit) {
			/* Reset before navigating so the back view transition starts clean. */
			peek = 0;
			options.onBack();
			return;
		}
		releasing = true;
		peek = 0;
	}

	function attach(node: HTMLElement) {
		/* touchstart/move stay passive (never block scroll); touchend is active
		   only so a committed swipe can cancel the synthesized click. */
		node.addEventListener('touchstart', onTouchStart, { passive: true });
		node.addEventListener('touchmove', onTouchMove, { passive: true });
		node.addEventListener('touchend', onTouchEnd, { passive: false });
		node.addEventListener('touchcancel', onTouchEnd, { passive: true });
		return {
			destroy() {
				node.removeEventListener('touchstart', onTouchStart);
				node.removeEventListener('touchmove', onTouchMove);
				node.removeEventListener('touchend', onTouchEnd);
				node.removeEventListener('touchcancel', onTouchEnd);
			}
		};
	}

	return {
		attach,
		get peek() {
			return peek;
		},
		get releasing() {
			return releasing;
		}
	};
}
