import { cn } from '$lib/utils/cn';

/** Max width shared by Simple mode mail list, reader, and settings. */
export const SIMPLE_CONTENT_MAX_WIDTH = '50rem';

/** Centered column shell (width + horizontal inset live in layout.css). */
export function simpleContentShellClass(): string {
	return 'z-simple-content w-full min-w-0';
}

/** Page padding for Simple mode scroll regions (settings, mail list, reader). */
export function simpleContentPagePadClass(compact = false): string {
	return cn(
		simpleContentShellClass(),
		compact
			? 'px-4 py-3.5 pb-[max(1.75rem,env(safe-area-inset-bottom))]'
			: 'px-4 py-4 pb-[max(2rem,env(safe-area-inset-bottom))] md:px-6 md:py-6'
	);
}
