/** Ensures only one swipe row stays open at a time within a list. */
let activeClose: (() => void) | null = null;

export function registerSwipeRow(close: () => void): void {
	activeClose?.();
	activeClose = close;
}

export function unregisterSwipeRow(close: () => void): void {
	if (activeClose === close) activeClose = null;
}

export function closeActiveSwipeRow(): void {
	activeClose?.();
	activeClose = null;
}
