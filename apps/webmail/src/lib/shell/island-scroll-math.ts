/* Hysteresis keeps the island from flickering on small scroll jitters. */
export const ISLAND_COLLAPSE_AFTER_PX = 32;
export const ISLAND_EXPAND_AFTER_PX = 16;
export const ISLAND_NEAR_TOP_PX = 48;
/* Scrollers with less range than this (e.g. letter rails) can't signal intent. */
export const ISLAND_MIN_SCROLL_RANGE_PX = 200;

/** Pure hysteresis step for the scroll-collapse engine (and unit tests). */
export function nextIslandCollapsed(options: {
	collapsed: boolean;
	scrollTop: number;
	delta: number;
	accumulated: number;
}): { collapsed: boolean; accumulated: number } {
	let { collapsed, scrollTop, delta, accumulated } = options;
	if (scrollTop < ISLAND_NEAR_TOP_PX) return { collapsed: false, accumulated: 0 };
	if (delta === 0) return { collapsed, accumulated };
	if (Math.sign(delta) !== Math.sign(accumulated)) accumulated = 0;
	accumulated += delta;
	if (accumulated > ISLAND_COLLAPSE_AFTER_PX) return { collapsed: true, accumulated: 0 };
	if (accumulated < -ISLAND_EXPAND_AFTER_PX) return { collapsed: false, accumulated: 0 };
	return { collapsed, accumulated };
}
