import { goto } from '$app/navigation';
import { page } from '$app/state';
import { viewport } from '#lib/viewport.svelte.ts';

/**
 * A full-screen layer — the drawer, an attachment preview, a contact, the
 * compose sheet — as a shallow history entry on a phone, so Back (the button,
 * the hardware key, iOS' back-swipe) closes it instead of leaving the screen
 * under it. Wider layouts have nothing to go back from: there it is plain
 * state. The reader's own entry (`mail/reader-thread.svelte.ts`) is the same
 * idea; a layer opened over it carries the reader's state along.
 */
export function backLayer(name: string, asEntry: () => boolean = () => viewport.phone) {
	let plain = $state(false);
	const isOpen = () => plain || page.state.layer === name;

	return {
		get open(): boolean {
			return isOpen();
		},
		show() {
			if (isOpen()) return;
			if (asEntry()) void goto(location.href, { state: { ...page.state, layer: name }, shallow: true });
			else plain = true;
		},
		hide() {
			plain = false;
			if (page.state.layer === name) history.back();
		}
	};
}
