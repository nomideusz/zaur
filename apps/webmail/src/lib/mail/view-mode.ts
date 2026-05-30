/** Primary Webmail mode: Simple (default) vs Classic 3-pane.
 *
 * The stored value remains "traditional" for compatibility with existing local
 * and account-synced preferences.
 */

import { webmailModeDefinition } from '$lib/modes/registry';

export type MailViewMode = 'simple' | 'traditional';

export const MAIL_VIEW_MODE_LABELS: Record<MailViewMode, string> = {
	simple: 'Simple',
	traditional: 'Classic'
};

export function isSimpleMailView(mode: MailViewMode): boolean {
	return mode === 'simple';
}

export function isTraditionalMailView(mode: MailViewMode): boolean {
	return mode === 'traditional';
}

/** Sectioned inbox folders (New / Read / etc.) — simple view only. */
export function usesSectionedMessageList(mode: MailViewMode): boolean {
	return webmailModeDefinition(mode).mail.useSectionedMessageList;
}

/** Left folder sidebar — traditional view only. */
export function showsMailboxSidebar(mode: MailViewMode): boolean {
	return webmailModeDefinition(mode).mail.showMailboxSidebar;
}

/** Global app header on /mail routes — traditional view only. */
export function showsAppShellOnMailRoutes(mode: MailViewMode): boolean {
	return webmailModeDefinition(mode).mail.showAppHeaderOnMailRoutes;
}

/** Classic list + reader split with empty-state reader — traditional view only. */
export function usesClassicSplitPanes(mode: MailViewMode): boolean {
	return webmailModeDefinition(mode).mail.useClassicSplitPanes;
}

/** Expanded list column on mailbox routes — simple view only. */
export function usesExpandedMessageList(mode: MailViewMode): boolean {
	return webmailModeDefinition(mode).mail.useExpandedMessageList;
}

/** Settings-style shell: sidebar + scrollable content (not simple chrome). */
export function usesSettingsStyleMailShell(mode: MailViewMode): boolean {
	return webmailModeDefinition(mode).mail.useClassicSplitPanes;
}

/** Hide list when a thread is open (desktop) — simple view unless list rail is on. */
export function usesAdaptiveReaderFocus(
	mode: MailViewMode,
	opts: { showReaderListRail: boolean }
): boolean {
	return webmailModeDefinition(mode).mail.useAdaptiveReaderFocus && !opts.showReaderListRail;
}

export function usesFullscreenMobileReader(mode: MailViewMode): boolean {
	return webmailModeDefinition(mode).mail.useFullscreenMobileReader;
}

export function showsEmptyReaderPane(mode: MailViewMode): boolean {
	return webmailModeDefinition(mode).mail.showEmptyReaderPane;
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
