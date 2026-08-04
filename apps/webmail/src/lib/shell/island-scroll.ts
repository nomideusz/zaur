import { mobileIsland } from '$lib/stores/mobile-island.svelte';
import {
	ISLAND_MIN_SCROLL_RANGE_PX,
	nextIslandCollapsed
} from './island-scroll-math.ts';

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
		const top = (el as HTMLElement).scrollTop;
		const prev = lastScrollTop.get(el);
		lastScrollTop.set(el, top);
		if (prev === undefined) return;
		if (el.scrollHeight - el.clientHeight < ISLAND_MIN_SCROLL_RANGE_PX) return;

		const delta = top - prev;
		const next = nextIslandCollapsed({
			collapsed: mobileIsland.collapsed,
			scrollTop: top,
			delta,
			accumulated
		});
		accumulated = next.accumulated;
		mobileIsland.collapsed = next.collapsed;
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
