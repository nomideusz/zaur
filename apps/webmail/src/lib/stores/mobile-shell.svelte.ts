import type { MessageDetail } from '$lib/types/mail';

/**
 * Context the reader screen registers so the mobile top bar can render message
 * actions (back / reply / more / delete) without reaching into the reader.
 */
export type TopBarReaderContext = {
	listHref: string;
	thread: MessageDetail[];
	mailboxRouteId: string;
	onMoved?: () => void;
	onBackToList?: () => void;
};

export type ComposeSchedulePreset = { label: string; date: Date };

/**
 * Context the compose screen registers for the mobile top bar (Send / schedule)
 * and back control.
 */
export type TopBarComposeContext = {
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
 * Mobile shell chrome — top bar state plus the combined nav drawer
 * (apps + mailboxes) opened from the hamburger button.
 */
class MobileShellStore {
	navDrawerOpen = $state(false);
	/** Session override: the Search nav item shows the top bar even when the
	 * persistent "show search bar" setting is off. */
	searchBarOpen = $state(false);
	/** One-shot: focus the search input once it renders (set with searchBarOpen). */
	searchBarFocusPending = $state(false);
	reader = $state<TopBarReaderContext | null>(null);
	compose = $state<TopBarComposeContext | null>(null);
	#readerGeneration = 0;
	#composeGeneration = 0;

	openNavDrawer() {
		this.navDrawerOpen = true;
	}

	closeNavDrawer() {
		this.navDrawerOpen = false;
	}

	setReader(ctx: TopBarReaderContext): number {
		const generation = ++this.#readerGeneration;
		this.reader = ctx;
		return generation;
	}

	clearReader(generation?: number) {
		if (generation !== undefined && generation !== this.#readerGeneration) return;
		this.reader = null;
	}

	setCompose(ctx: TopBarComposeContext): number {
		const generation = ++this.#composeGeneration;
		this.compose = ctx;
		return generation;
	}

	clearCompose(generation?: number) {
		if (generation !== undefined && generation !== this.#composeGeneration) return;
		this.compose = null;
	}
}

export const mobileShell = new MobileShellStore();
