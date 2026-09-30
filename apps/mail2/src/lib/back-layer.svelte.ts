import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { page } from '$app/state';
import { viewport } from '#lib/viewport.svelte.ts';

let queue: Promise<unknown> = Promise.resolve();

/**
 * History changes one at a time, each from where the last one left things. A
 * step back lands some ticks after it is asked for, so a URL patch or a new
 * entry written straight after it would otherwise hit the entry being left.
 */
export function inOrder(step: () => unknown): Promise<void> {
	const done = queue.then(step).then(
		() => {},
		() => {}
	);
	queue = done;
	return done;
}

/** One entry back, settled once Kit has applied the entry underneath (`still` turns false). */
export async function stepBack(still: () => boolean): Promise<void> {
	if (!still()) return;
	history.back();
	// ponytail: polled, Kit has no event for a shallow pop; gives up after half a second.
	for (let tries = 0; tries < 50 && still(); tries += 1) await new Promise((resolve) => setTimeout(resolve, 10));
}

/** A layer has been made since the document loaded. */
let loaded = false;
/** The layer a page put back on the entry it was reloaded on. */
let kept: string | null = null;

/**
 * A full-screen layer — the drawer, an attachment preview, a contact, the
 * compose sheet — as a shallow history entry on a phone, so Back (the button,
 * the hardware key, iOS' back-swipe) closes it instead of leaving the screen
 * under it. Wider layouts have nothing to go back from: there it is plain
 * state. The reader's own entry (`mail/reader-thread.svelte.ts`) is the same
 * idea; a layer opened over it carries the reader's state along.
 *
 * `hide()` on an entry is a step back, which takes a moment: await it (or go
 * through `inOrder`) before navigating anywhere else.
 *
 * A reload keeps the entry (and its state: `persistState`) but not what the
 * layer was showing. A page that knows (a snapshot) calls `show()` again and
 * the layer is back on its entry; an entry nobody claims is stepped off,
 * whichever layer it was for, so that Back is not spent on nothing.
 */
export function backLayer(name: string, asEntry: () => boolean = () => viewport.phone) {
	if (browser && !loaded) {
		loaded = true;
		// A timer: after the page has mounted and restored what it keeps.
		setTimeout(() => {
			const stale = page.state.layer;
			if (stale && stale !== kept) void inOrder(() => stepBack(() => page.state.layer === stale));
		});
	}
	let plain = $state(false);
	const isEntry = () => page.state.layer === name;
	const isOpen = () => plain || isEntry();

	return {
		get open(): boolean {
			return isOpen();
		},
		show(): Promise<void> {
			if (isEntry()) kept = name;
			if (!asEntry()) {
				plain = true;
				return Promise.resolve();
			}
			return inOrder(() => {
				if (!isOpen()) {
					return goto(location.href, { state: { ...page.state, layer: name }, shallow: true, persistState: true });
				}
			});
		},
		hide(): Promise<void> {
			plain = false;
			return inOrder(() => stepBack(isEntry));
		}
	};
}
