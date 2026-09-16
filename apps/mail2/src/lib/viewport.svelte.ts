/**
 * The shell's layout mode, read from the same two breakpoints the CSS uses.
 *
 * Everything that *can* be layout lives in CSS (`.z-shell` and `max-md:` /
 * `max-lg:` utilities). This module exists for the three things that can't be:
 * the compose panel's inline-styled window geometry, which sidebar flag the
 * toggle writes to, and whether opening a thread pushes a history entry.
 */
const PHONE = '(max-width: 767px)'; /* one pane at a time, compose is a sheet */
const COMPACT = '(max-width: 1023px)'; /* sidebar is an overlay drawer */

export const viewport = $state({ phone: false, compact: false });

if (typeof window !== 'undefined') {
	for (const [key, query] of [
		['phone', PHONE],
		['compact', COMPACT]
	] as const) {
		const mq = window.matchMedia(query);
		viewport[key] = mq.matches;
		mq.addEventListener('change', (event) => (viewport[key] = event.matches));
	}
}
