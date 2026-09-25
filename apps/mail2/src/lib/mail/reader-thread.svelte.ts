import { goto } from '$app/navigation';
import { page } from '$app/state';
import { viewport } from '#lib/viewport.svelte.ts';

let queue: Promise<unknown> = Promise.resolve();

/**
 * Sets (or, with null, drops) query parameters on the current entry — or, with
 * `push`, on a new shallow entry carrying that state. One at a time, each from
 * the URL the last one left: two written back to back (a folder change that
 * also closes the reader) would otherwise each undo the other.
 */
export function patchQuery(params: Record<string, string | null>, push?: App.PageState) {
	queue = queue
		.then(() => {
			// Not `page.url`: a shallow entry leaves it at the URL the page loaded on.
			const url = new URL(location.href);
			for (const [key, value] of Object.entries(params)) {
				if (value === null) url.searchParams.delete(key);
				else url.searchParams.set(key, value);
			}
			if (push) return goto(url, { state: push, shallow: true });
			if (url.href !== location.href) return goto(url, { state: page.state, shallow: true, replace: true });
		})
		.catch(() => {});
}

/**
 * Which thread the reader shows, mirrored in `?thread=` so a reload or a
 * copied link reopens it.
 *
 * On a phone the reader is a screen, not a pane, so it lives in a shallow
 * history entry: Back — the button, the hardware key, iOS' back-swipe —
 * returns to the list instead of leaving the app. Wider layouts show the list
 * and the reader at once, so there is nothing to go back from and it stays
 * plain state.
 */
export function readerThread(initial: string | null = null) {
	let pane = $state<string | null>(initial);

	return {
		get id(): string | null {
			return page.state.reader ?? pane;
		},
		open(threadId: string) {
			if (viewport.phone) return patchQuery({ thread: threadId }, { reader: threadId });
			pane = threadId;
			patchQuery({ thread: threadId });
		},
		close() {
			if (page.state.reader) return history.back();
			pane = null;
			patchQuery({ thread: null });
		}
	};
}
