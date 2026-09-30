/**
 * Where the on-screen keyboard leaves the page.
 *
 * Chrome shrinks the layout viewport (`interactive-widget=resizes-content` in
 * app.html), so this measurement is empty there and the shells stay on `svh`.
 * iOS, including the installed app, paints the keyboard over the page and pans
 * the visual viewport instead. WebKit still has no `interactive-widget`
 * (https://bugs.webkit.org/show_bug.cgi?id=259770), so the shell has to follow
 * the visual viewport itself: its height becomes the visible strip, and a
 * translate puts that strip back under the pan.
 *
 * Anything shorter than a keyboard is the browser chrome moving, not a keyboard.
 */
export const KEYBOARD_MIN = 100;

export function keyboardFrame(
	innerHeight: number,
	viewHeight: number,
	offsetTop: number
): { height: number; top: number } | null {
	const covered = Math.round(innerHeight - viewHeight - offsetTop);
	if (covered < KEYBOARD_MIN) return null;
	return { height: Math.round(viewHeight), top: Math.max(0, Math.round(offsetTop)) };
}

/**
 * Chrome's way leaves nothing to measure against the visual viewport — the
 * layout shrank with it — so it is measured against the tallest this window
 * has been at its width, and only while something is being typed into: a
 * window that is simply short has no keyboard in it.
 */
export function layoutShrank(tallest: number, innerHeight: number, editing: boolean): boolean {
	return editing && tallest - innerHeight >= KEYBOARD_MIN;
}

const TOUCH = '(hover: none) and (pointer: coarse)';

let installed = false;

/** Installed once from the root layout. No-op on the server and on a desk. */
export function installKeyboardInset(): void {
	if (typeof window === 'undefined' || installed) return;
	installed = true;
	const vv = window.visualViewport;
	if (!vv) return;

	const root = document.documentElement;
	const touch = window.matchMedia(TOUCH);
	let frame = 0;
	let height = '';
	let top = '';
	let width = 0;
	let tallest = 0;

	const sync = () => {
		frame = 0;
		// A turn of the phone starts the measure again.
		if (window.innerWidth !== width) tallest = 0;
		width = window.innerWidth;
		tallest = Math.max(tallest, window.innerHeight);
		const next = touch.matches ? keyboardFrame(window.innerHeight, vv.height, vv.offsetTop) : null;
		const active = document.activeElement as HTMLElement | null;
		const editing = !!active && (active.isContentEditable || active.matches('input, textarea'));
		// The class is what hides the tab row; the frame below is iOS' alone.
		root.classList.toggle(
			'z-keyboard-open',
			!!next || (touch.matches && layoutShrank(tallest, window.innerHeight, editing))
		);
		const nextHeight = next ? `${next.height}px` : '';
		const nextTop = next ? `${next.top}px` : '';
		if (nextHeight === height && nextTop === top) return;
		height = nextHeight;
		top = nextTop;
		if (!next) {
			root.style.removeProperty('--z-vv-height');
			root.style.removeProperty('--z-vv-top');
			return;
		}
		root.style.setProperty('--z-vv-height', nextHeight);
		root.style.setProperty('--z-vv-top', nextTop);
		// The pan is the browser scrolling the page to chase the caret. The
		// shell is not a document scroller; putting the page back lets the
		// translate own that offset instead of stacking on top of it.
		if (window.scrollY !== 0) window.scrollTo(0, 0);
	};

	const schedule = () => {
		if (frame) return;
		frame = requestAnimationFrame(sync);
	};

	touch.addEventListener('change', schedule);
	vv.addEventListener('resize', schedule);
	vv.addEventListener('scroll', schedule);
	window.addEventListener('scroll', schedule);
	window.addEventListener('resize', schedule);
	document.addEventListener('focusin', schedule);
	document.addEventListener('focusout', schedule);
	sync();
}
