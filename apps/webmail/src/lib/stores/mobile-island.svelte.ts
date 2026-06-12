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
 * State for the mobile floating island — the single piece of bottom chrome on
 * phones. Which mode shows is derived centrally in MobileIsland.svelte;
 * screens register data/handlers the island can't derive globally via the
 * generation-counter set/clear pattern (see shell-header.svelte.ts).
 */
class MobileIslandStore {
	/** Scroll-shrunk to a minimal pill. */
	collapsed = $state(false);
	/** Mail-tabs mode temporarily showing app navigation. */
	appsOverlay = $state(false);
	reader = $state<IslandReaderContext | null>(null);
	compose = $state<IslandComposeContext | null>(null);
	#readerGeneration = 0;
	#composeGeneration = 0;

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
