import { cn } from '$lib/utils/cn';

/** Max width shared by Simple mode mail list, reader, and settings (~70 characters). */
export const SIMPLE_CONTENT_MAX_WIDTH = '44rem';

/** Centered column shell (width + horizontal inset live in layout.css). */
export function simpleContentShellClass(): string {
	return 'z-simple-content w-full min-w-0';
}

/** Page padding for Simple mode scroll regions (settings, mail list, reader). */
export function simpleContentPagePadClass(): string {
	return cn(
		simpleContentShellClass(),
		'px-4 py-4 pb-[max(2rem,env(safe-area-inset-bottom))] md:px-6 md:py-6'
	);
}

/** Simple settings — same width and insets as the mail list/reader/compose pages. */
export function simpleSettingsShellClass(): string {
	return cn(
		simpleContentShellClass(),
		'px-4 pt-4 pb-[max(2rem,env(safe-area-inset-bottom))] md:px-6 md:pt-6 md:pb-6'
	);
}
