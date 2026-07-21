import type { MessageDetail } from '$lib/types/mail';

/**
 * Context the reader screen registers so the island can render message
 * actions (back / reply / more / delete) without reaching into the reader.
 */
export type IslandReaderContext = {
	listHref: string;
	thread: MessageDetail[];
	mailboxRouteId: string;
	onMoved?: () => void;
	onBackToList?: () => void;
};

/**
 * Mobile floating island — mail context toolbar plus combined nav drawer
 * (apps + mailboxes) opened from the menu button.
 */
class MobileIslandStore {
	navDrawerOpen = $state(false);
	/** Session override: the Search nav item shows the top bar even when the
	 * persistent "show search bar" setting is off. */
	searchBarOpen = $state(false);
	/** One-shot: focus the search input once it renders (set with searchBarOpen). */
	searchBarFocusPending = $state(false);
	reader = $state<IslandReaderContext | null>(null);
	#readerGeneration = 0;

	openNavDrawer() {
		this.navDrawerOpen = true;
	}

	closeNavDrawer() {
		this.navDrawerOpen = false;
	}

	setReader(ctx: IslandReaderContext): number {
		const generation = ++this.#readerGeneration;
		this.reader = ctx;
		return generation;
	}

	clearReader(generation?: number) {
		if (generation !== undefined && generation !== this.#readerGeneration) return;
		this.reader = null;
	}
}

export const mobileIsland = new MobileIslandStore();
