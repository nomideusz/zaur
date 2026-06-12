import { mobileIsland } from '$lib/stores/mobile-island.svelte';

/* Hysteresis keeps the island from flickering on small scroll jitters. */
const COLLAPSE_AFTER_PX = 32;
const EXPAND_AFTER_PX = 16;
const NEAR_TOP_PX = 48;
/* Scrollers with less range than this (e.g. letter rails) can't signal intent. */
const MIN_SCROLL_RANGE_PX = 200;

/**
 * Collapses/expands the mobile island based on scroll direction. All app
 * scrolling happens in inner panes (never the window), so a single
 * capture-phase document listener observes every scroller without
 * per-screen wiring. Returns a detach function.
 */
export function attachIslandScrollEngine(): () => void {
	const lastScrollTop = new WeakMap<Element, number>();
	const queued = new Set<Element>();
	let accumulated = 0;
	let frame = 0;

	function process(el: Element) {
		const top = el.scrollTop;
		const prev = lastScrollTop.get(el);
		lastScrollTop.set(el, top);
		if (prev === undefined) return;
		if (el.scrollHeight - el.clientHeight < MIN_SCROLL_RANGE_PX) return;

		const delta = top - prev;
		if (delta === 0) return;

		if (top < NEAR_TOP_PX) {
			accumulated = 0;
			mobileIsland.collapsed = false;
			return;
		}

		if (Math.sign(delta) !== Math.sign(accumulated)) accumulated = 0;
		accumulated += delta;

		if (accumulated > COLLAPSE_AFTER_PX) {
			mobileIsland.collapsed = true;
			accumulated = 0;
		} else if (accumulated < -EXPAND_AFTER_PX) {
			mobileIsland.collapsed = false;
			accumulated = 0;
		}
	}

	function onScroll(event: Event) {
		const target = event.target;
		if (!(target instanceof Element)) return;
		queued.add(target);
		if (frame) return;
		frame = requestAnimationFrame(() => {
			frame = 0;
			for (const el of queued) process(el);
			queued.clear();
		});
	}

	document.addEventListener('scroll', onScroll, { capture: true, passive: true });

	return () => {
		document.removeEventListener('scroll', onScroll, { capture: true });
		if (frame) cancelAnimationFrame(frame);
	};
}
