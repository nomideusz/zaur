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

/** Context the compose screen registers for the island's compose actions. */
export type IslandComposeContext = {
	onBack: () => void;
	onSend: () => void;
	onAttach: () => void;
	onDiscard: () => void;
	sendLabel: string;
	sendDisabled: boolean;
	isEmpty: boolean;
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
	/** Scroll-shrunk to a minimal pill (list/section browse modes only). */
	collapsed = $state(false);
	reader = $state<IslandReaderContext | null>(null);
	compose = $state<IslandComposeContext | null>(null);
	#readerGeneration = 0;
	#composeGeneration = 0;

	openNavDrawer() {
		this.navDrawerOpen = true;
	}

	closeNavDrawer() {
		this.navDrawerOpen = false;
	}

	expand() {
		this.collapsed = false;
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

	setCompose(ctx: IslandComposeContext): number {
		const generation = ++this.#composeGeneration;
		this.compose = ctx;
		return generation;
	}

	clearCompose(generation?: number) {
		if (generation !== undefined && generation !== this.#composeGeneration) return;
		this.compose = null;
	}
}

export const mobileIsland = new MobileIslandStore();
