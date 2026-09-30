import { beforeNavigate } from '$app/navigation';

/**
 * Unsaved work asks before it is dropped. Leaving the page — a link, a section
 * tab, Back, a reload — asks here (closing the tab, the browser asks in its own
 * words once we cancel). The ways out that stay on the page — a layer's Back
 * entry, Escape, opening something else in its place — call what this returns:
 * `true` when there is nothing to lose, or the person says to drop it.
 *
 * Call it while the component initialises, as `beforeNavigate` must be.
 */
export function leaveGuard(dirty: () => boolean, what: string | (() => string)): () => boolean {
	const ask = () => confirm(`Leave without saving ${typeof what === 'string' ? what : what()}?`);
	beforeNavigate((navigation) => {
		// A layer's history entry (the compose sheet on a phone) stays on this page.
		if (!dirty() || navigation.to?.url.pathname === navigation.from?.url.pathname) return;
		if (navigation.willUnload || !ask()) navigation.cancel();
	});
	return () => !dirty() || ask();
}
