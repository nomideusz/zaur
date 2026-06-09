import type { Component } from 'svelte';

export type MailHeaderContext = {
	mailboxName: string;
	countLabel: string;
	mailboxRouteId?: string;
	loading: boolean;
	error: string | null;
	messageCount: number;
	onBulkAction?: () => void;
	onBack?: () => void;
	showNewMessage: boolean;
};

export type MailListToolbarContext = {
	mailboxRouteId: string;
	disabled: boolean;
};

export type ShellPrimaryAction =
	| { kind: 'button'; label: string; onclick: () => void; icon?: Component }
	| { kind: 'link'; href: string; label: string; icon?: Component };

export type ShellContactsNavContext = {
	selectedLetter: string | null;
	query: string;
	letters: string[];
	onShowAll: () => void;
	onSelectLetter: (letter: string | null) => void;
	onFocusSearch: () => void;
};

export type ShellPageContext = {
	title?: string;
	primaryAction?: ShellPrimaryAction;
	contactsNav?: ShellContactsNavContext;
};

class ShellHeaderStore {
	mail = $state<MailHeaderContext | null>(null);
	mailListToolbar = $state<MailListToolbarContext | null>(null);
	page = $state<ShellPageContext | null>(null);
	#mailGeneration = 0;
	#mailListToolbarGeneration = 0;
	#pageGeneration = 0;

	setMail(ctx: MailHeaderContext): number {
		const generation = ++this.#mailGeneration;
		this.mail = ctx;
		return generation;
	}

	clearMail(generation?: number) {
		if (generation !== undefined && generation !== this.#mailGeneration) return;
		this.mail = null;
	}

	setMailListToolbar(ctx: MailListToolbarContext): number {
		const generation = ++this.#mailListToolbarGeneration;
		this.mailListToolbar = ctx;
		return generation;
	}

	clearMailListToolbar(generation?: number) {
		if (generation !== undefined && generation !== this.#mailListToolbarGeneration) return;
		this.mailListToolbar = null;
	}

	setPage(ctx: ShellPageContext): number {
		const generation = ++this.#pageGeneration;
		this.page = ctx;
		return generation;
	}

	clearPage(generation?: number) {
		if (generation !== undefined && generation !== this.#pageGeneration) return;
		this.page = null;
	}
}

export const shellHeader = new ShellHeaderStore();
