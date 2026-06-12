/** Ensures only one swipe row stays open at a time within a list. */
let activeClose: (() => void) | null = null;
let scrollCloser: (() => void) | null = null;

/* Scrolling past an open tray closes it — the gesture has moved on. */
function attachScrollCloser() {
	if (scrollCloser || typeof document === 'undefined') return;
	scrollCloser = () => closeActiveSwipeRow();
	document.addEventListener('scroll', scrollCloser, { capture: true, passive: true });
}

function detachScrollCloser() {
	if (!scrollCloser || typeof document === 'undefined') return;
	document.removeEventListener('scroll', scrollCloser, { capture: true });
	scrollCloser = null;
}

export function registerSwipeRow(close: () => void): void {
	if (activeClose !== close) activeClose?.();
	activeClose = close;
	attachScrollCloser();
}

export function unregisterSwipeRow(close: () => void): void {
	if (activeClose === close) {
		activeClose = null;
		detachScrollCloser();
	}
}

/** Returns true when an open row was actually closed. */
export function closeActiveSwipeRow(): boolean {
	if (!activeClose) return false;
	const close = activeClose;
	activeClose = null;
	detachScrollCloser();
	close();
	return true;
}

/** Close any open row except `keep` — lets a row keep its own open state while tidying others. */
export function closeOtherSwipeRows(keep: () => void): boolean {
	if (!activeClose || activeClose === keep) return false;
	return closeActiveSwipeRow();
}
