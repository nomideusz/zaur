import { browser } from '$app/environment';

/** True when the primary input is touch / coarse pointer (phones, most tablets). */
export function isCoarsePointer(): boolean {
	if (!browser) return false;
	return window.matchMedia('(pointer: coarse)').matches;
}

/** Layout breakpoint used for mobile-specific list UX (matches Tailwind `md`). */
export function isMobileLayout(): boolean {
	if (!browser) return false;
	return window.matchMedia('(max-width: 767px)').matches;
}

export function supportsMobileListGestures(): boolean {
	return isCoarsePointer() || isMobileLayout();
}

/** Desktop-style hover (mouse/trackpad). False on most phones/tablets. */
export function hasPreciseHover(): boolean {
	if (!browser) return true;
	return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}
