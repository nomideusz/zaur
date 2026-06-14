import { haptic } from '$lib/utils/haptics';
import { isCoarsePointer } from '$lib/utils/pointer-env';

/* Pull distance (px) that arms a refresh; beyond it the pull rubber-bands. */
const TRIGGER_PX = 64;
const MAX_PX = 96;
/* Resting offset the indicator holds while the refresh runs. */
const REST_PX = 52;
const RESISTANCE = 0.5;
/* Floor on indicator visibility so a fast refresh doesn't flash and vanish. */
const MIN_VISIBLE_MS = 600;

interface PullToRefreshOptions {
	onRefresh: () => Promise<unknown>;
	/** Gate per gesture — e.g. only on the list, not while bulk-selecting. */
	canPull?: () => boolean;
}

/**
 * Touch pull-to-refresh for an inner scroll pane. Listeners are strictly
 * passive — the gesture never calls preventDefault, so it cannot interfere
 * with native scrolling or the horizontal swipe rows: it only engages when the
 * pane is already at scrollTop 0 and the finger travels downward, where there
 * is nothing left to scroll. Returns reactive state + a Svelte action.
 */
export function createPullToRefresh(options: PullToRefreshOptions) {
	let pull = $state(0);
	let refreshing = $state(false);
	/** True between release and settle — gates the snap-back transition. */
	let releasing = $state(false);

	const progress = $derived(Math.min(pull / TRIGGER_PX, 1));

	let scrollEl: HTMLElement | null = null;
	let startY = 0;
	let tracking = false;
	let armed = false;

	function allowed(): boolean {
		if (!isCoarsePointer()) return false;
		return options.canPull?.() ?? true;
	}

	function resist(dy: number): number {
		if (dy <= TRIGGER_PX) return dy;
		return TRIGGER_PX + (dy - TRIGGER_PX) * RESISTANCE;
	}

	function clearPull() {
		tracking = false;
		armed = false;
		pull = 0;
	}

	function onTouchStart(event: TouchEvent) {
		if (refreshing || event.touches.length !== 1) return;
		if (!scrollEl || scrollEl.scrollTop > 0) return;
		if (!allowed()) return;
		startY = event.touches[0].clientY;
		tracking = true;
		armed = false;
		releasing = false;
	}

	function onTouchMove(event: TouchEvent) {
		if (!tracking || refreshing) return;
		if (!scrollEl || scrollEl.scrollTop > 0) {
			if (pull !== 0) clearPull();
			return;
		}
		const dy = event.touches[0].clientY - startY;
		if (dy <= 0) {
			pull = 0;
			armed = false;
			return;
		}
		pull = Math.min(resist(dy), MAX_PX);
		const nextArmed = pull >= TRIGGER_PX;
		if (nextArmed !== armed) {
			armed = nextArmed;
			if (armed) haptic(10);
		}
	}

	async function onTouchEnd() {
		if (!tracking) return;
		tracking = false;
		releasing = true;
		if (!armed) {
			pull = 0;
			return;
		}
		armed = false;
		refreshing = true;
		pull = REST_PX;
		const minVisible = new Promise((resolve) => setTimeout(resolve, MIN_VISIBLE_MS));
		try {
			await Promise.all([options.onRefresh(), minVisible]);
		} catch {
			await minVisible;
		}
		refreshing = false;
		pull = 0;
	}

	function attach(node: HTMLElement) {
		scrollEl = node;
		const opts = { passive: true } as const;
		node.addEventListener('touchstart', onTouchStart, opts);
		node.addEventListener('touchmove', onTouchMove, opts);
		node.addEventListener('touchend', onTouchEnd, opts);
		node.addEventListener('touchcancel', onTouchEnd, opts);
		return {
			destroy() {
				node.removeEventListener('touchstart', onTouchStart);
				node.removeEventListener('touchmove', onTouchMove);
				node.removeEventListener('touchend', onTouchEnd);
				node.removeEventListener('touchcancel', onTouchEnd);
				scrollEl = null;
			}
		};
	}

	return {
		attach,
		get pull() {
			return pull;
		},
		get progress() {
			return progress;
		},
		get refreshing() {
			return refreshing;
		},
		get armed() {
			return armed;
		},
		get releasing() {
			return releasing;
		}
	};
}
