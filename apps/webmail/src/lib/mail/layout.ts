import { cn } from '$lib/utils/cn';

/** Centered column shell (width + horizontal inset live in mail-view.css). */
function contentShellClass(): string {
	return 'z-content-shell w-full min-w-0';
}

/** Settings shell — horizontal inset from settings.css on mobile; desktop matches mail pages. */
export function settingsShellClass(): string {
	return cn(contentShellClass(), 'pt-0 pb-0 md:px-6 md:py-6');
}
