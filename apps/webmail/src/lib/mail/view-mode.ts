/** One-time migration from Classic (`traditional`) and legacy localStorage flags. */
export function migrateLegacyMailViewMode(): void {
	if (typeof localStorage === 'undefined') return;

	const stored = localStorage.getItem('zaur:mail-view-mode');
	if (stored === 'traditional') {
		localStorage.setItem('zaur:mail-view-mode', 'simple');
	}

	const legacyTraditional = localStorage.getItem('zaur:traditional-mailbox-view') === 'true';
	const legacyFocus = localStorage.getItem('zaur:focus-layout-mode') === 'classic';
	if (legacyTraditional || legacyFocus) {
		localStorage.setItem('zaur:mail-view-mode', 'simple');
		localStorage.setItem('zaur:traditional-mailbox-view', 'false');
		localStorage.setItem('zaur:focus-layout-mode', 'adaptive');
	}
}
