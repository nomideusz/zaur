/** Primary mail chrome: simple (default) vs traditional 3-pane. */

export type MailViewMode = 'simple' | 'traditional';

export const MAIL_VIEW_MODE_LABELS: Record<MailViewMode, string> = {
	simple: 'Simple',
	traditional: 'Traditional (3-pane)'
};

export function isSimpleMailView(mode: MailViewMode): boolean {
	return mode === 'simple';
}

export function isTraditionalMailView(mode: MailViewMode): boolean {
	return mode === 'traditional';
}

/** Sectioned inbox folders (New / Read / etc.) — simple view only. */
export function usesSectionedMessageList(mode: MailViewMode): boolean {
	return isSimpleMailView(mode);
}

/** Left folder sidebar — traditional view only. */
export function showsMailboxSidebar(mode: MailViewMode): boolean {
	return isTraditionalMailView(mode);
}

/** Global app header on /mail routes — traditional view only. */
export function showsAppShellOnMailRoutes(mode: MailViewMode): boolean {
	return isTraditionalMailView(mode);
}

/** Classic list + reader split with empty-state reader — traditional view only. */
export function usesClassicSplitPanes(mode: MailViewMode): boolean {
	return isTraditionalMailView(mode);
}

/** Expanded list column on mailbox routes — simple view only. */
export function usesExpandedMessageList(mode: MailViewMode): boolean {
	return isSimpleMailView(mode);
}

/** Settings-style shell: sidebar + scrollable content (not simple chrome). */
export function usesSettingsStyleMailShell(mode: MailViewMode): boolean {
	return isTraditionalMailView(mode);
}

/** Hide list when a thread is open (desktop) — simple view unless list rail is on. */
export function usesAdaptiveReaderFocus(
	mode: MailViewMode,
	opts: { showReaderListRail: boolean }
): boolean {
	return isSimpleMailView(mode) && !opts.showReaderListRail;
}

/** Derive view mode from legacy localStorage flags (pre mailViewMode). */
export function mailViewModeFromLegacy(stored: {
	traditionalMailboxView: boolean;
	focusLayoutMode: 'adaptive' | 'classic';
}): MailViewMode {
	if (stored.traditionalMailboxView || stored.focusLayoutMode === 'classic') {
		return 'traditional';
	}
	return 'simple';
}

export function legacyFlagsForMailViewMode(mode: MailViewMode): {
	focusLayoutMode: 'adaptive' | 'classic';
	traditionalMailboxView: boolean;
} {
	return mode === 'simple'
		? { focusLayoutMode: 'adaptive', traditionalMailboxView: false }
		: { focusLayoutMode: 'classic', traditionalMailboxView: true };
}
