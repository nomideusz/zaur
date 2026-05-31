import { cn } from '$lib/utils/cn';

/** Max width shared by mail list, reader, settings, and compose (~70 characters). */
export const CONTENT_MAX_WIDTH = '44rem';

/** Centered column shell (width + horizontal inset live in mail-view.css). */
export function contentShellClass(): string {
	return 'z-content-shell w-full min-w-0';
}

/** Page padding for mail and settings scroll regions. */
export function contentPagePadClass(): string {
	return cn(
		contentShellClass(),
		'px-4 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:px-6 md:py-6'
	);
}

/** Settings shell — same width and insets as mail pages. */
export function settingsShellClass(): string {
	return contentPagePadClass();
}
