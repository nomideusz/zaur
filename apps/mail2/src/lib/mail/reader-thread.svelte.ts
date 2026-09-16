import { goto } from '$app/navigation';
import { page } from '$app/state';
import { viewport } from '#lib/viewport.svelte.ts';

/**
 * Which thread the reader shows.
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
			if (viewport.phone) void goto('', { state: { reader: threadId }, shallow: true });
			else pane = threadId;
		},
		close() {
			if (page.state.reader) history.back();
			else pane = null;
		}
	};
}
