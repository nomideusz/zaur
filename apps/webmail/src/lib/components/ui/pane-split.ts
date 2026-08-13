/** How a panel behaves below the md breakpoint. */
export type PaneSplitMobile = 'hide' | 'fill' | 'keep';

/** localStorage keys and default percentage sizes for desktop pane splitters. */

export const PANE_SPLIT = {
	mailNav: { key: 'zaur:mail-split', defaultSize: [18, 82] },
	mailList: { key: 'zaur:mail-list-split', defaultSize: [36, 64] },
	calendarNav: { key: 'zaur:calendar-nav-split', defaultSize: [18, 82] },
	calendarEvent: { key: 'zaur:calendar-event-split', defaultSize: [68, 32] },
	calendarAgenda: { key: 'zaur:calendar-agenda-split', defaultSize: [28, 72] },
	contactsNav: { key: 'zaur:contacts-nav-split', defaultSize: [18, 82] },
	contactsList: { key: 'zaur:contacts-list-split', defaultSize: [38, 62] },
	filesNav: { key: 'zaur:files-nav-split', defaultSize: [18, 82] },
	filesList: { key: 'zaur:files-list-split', defaultSize: [38, 62] },
	settingsNav: { key: 'zaur:settings-nav-split', defaultSize: [18, 82] }
} as const;

export function loadPaneSplit(key: string, fallback: readonly number[]): number[] {
	try {
		const stored = JSON.parse(localStorage.getItem(key) ?? '');
		if (
			Array.isArray(stored) &&
			stored.length === 2 &&
			stored.every((n) => typeof n === 'number' && n > 0)
		) {
			return stored;
		}
	} catch {
		/* SSR, private mode, or corrupt value — use default */
	}
	return [...fallback];
}

export function savePaneSplit(key: string, size: number[]): void {
	try {
		localStorage.setItem(key, JSON.stringify(size));
	} catch {
		/* private mode — resize just won't persist */
	}
}
