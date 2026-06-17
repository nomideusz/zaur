/** Ignore toolbar / address-bar jitter; only treat large offsets as a keyboard. */
const KEYBOARD_OFFSET_THRESHOLD_PX = 120;

/**
 * Pixels the visual viewport sits above the layout bottom — typically an open
 * software keyboard. Small values are browser-chrome noise on mobile Safari.
 */
export function visualViewportKeyboardOffset(): number {
	if (typeof window === 'undefined') return 0;

	const vv = window.visualViewport;
	if (!vv) return 0;

	const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
	return offset >= KEYBOARD_OFFSET_THRESHOLD_PX ? offset : 0;
}
