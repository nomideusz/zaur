/**
 * Shared look for mobile header segment rails — mail folders, calendar views,
 * settings sections, contacts filters. One source so every page's rail reads
 * identically: muted text items, accent pill on the current one.
 */
export const MOBILE_RAIL_ITEM_CLASS =
	'px-2.5 py-1.5 text-sm font-medium text-fg-muted data-[state=checked]:font-semibold data-[state=checked]:text-fg';

export const MOBILE_RAIL_INDICATOR_CLASS = 'z-segment-group__indicator--accent rounded-full';

export const MOBILE_RAIL_GROUP_CLASS = 'rounded-full px-0.5';

/* Island variant — taller items so segment targets stay ≥44px inside the pill. */
export const ISLAND_RAIL_ITEM_CLASS =
	'min-h-11 px-3 py-2.5 text-sm font-medium text-fg-muted data-[state=checked]:font-semibold data-[state=checked]:text-fg';

/* Fixed top bar — compact but still ≥40px tap targets. */
export const TOPBAR_RAIL_ITEM_CLASS =
	'min-h-10 px-2.5 py-2 text-sm font-medium text-fg-muted data-[state=checked]:font-semibold data-[state=checked]:text-fg';
