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

export type ComposeSchedulePreset = { label: string; date: Date };

/**
 * Context the compose screen registers for the mobile top bar (Send / schedule)
 * and back control. The floating island is not used on compose.
 */
export type IslandComposeContext = {
	onBack: () => void;
	onSend: () => void;
	sendLabel: string;
	sendDisabled: boolean;
	sendBlockedReason: string | null;
	/** Draft status or mode title shown in the top bar. */
	title: string;
	scheduleDisabled: boolean;
	showSchedulePanel: boolean;
	toggleSchedulePanel: () => void;
	closeSchedulePanel: () => void;
	schedulePresets: ComposeSchedulePreset[];
	scheduleSendAt: (date: Date) => void | Promise<void>;
	customSendTime: string;
	setCustomSendTime: (value: string) => void;
	customSendTimeMin: string;
	formatScheduleTime: (date: Date) => string;
};

/**
 * Mobile floating island — mail context toolbar plus combined nav drawer
 * (apps + mailboxes) opened from the menu button.
 */
class MobileIslandStore {
	navDrawerOpen = $state(false);
	/** Bottom sheet for quick multi-account switching from the island rail. */
	accountSwitcherOpen = $state(false);
	/** Labs / tests can intercept switches without hitting the session API. */
	accountSwitchHandler: ((key: string) => void | Promise<void>) | null = null;
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

	openAccountSwitcher() {
		this.collapsed = false;
		this.accountSwitcherOpen = true;
	}

	closeAccountSwitcher() {
		this.accountSwitcherOpen = false;
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
