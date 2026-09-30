import type { User } from '#lib/types';

declare global {
	namespace App {
		interface Locals {
			/** The signed-in Zaur account, from the session cookie. */
			user: User | null;
		}
		interface PageState {
			/** The Now playing sheet is open: its own history entry, so Back closes it. */
			nowPlaying?: boolean;
			/** A menu or a card (Sheet.svelte) is open: the same, and kept over a reload so its entry can be stepped over. */
			sheet?: boolean;
		}
	}
}

export {};
