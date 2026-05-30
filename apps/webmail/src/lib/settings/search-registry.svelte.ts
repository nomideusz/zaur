import { browser } from '$app/environment';
import type { MailViewMode } from '$lib/mail/view-mode';
import { settings } from '$lib/stores/settings.svelte';
import { SETTINGS_SEARCH_INDEX, type SettingsSearchEntry } from './search-index';

export type { SettingsSearchEntry };

class SettingsSearchRegistry {
	query = $state('');
	private liveEntries = new Map<string, SettingsSearchEntry>();

	setQuery(value: string) {
		this.query = value;
	}

	register(entry: SettingsSearchEntry) {
		this.liveEntries.set(entry.id, entry);
	}

	unregister(id: string) {
		this.liveEntries.delete(id);
	}

	allEntries(): SettingsSearchEntry[] {
		const merged = new Map<string, SettingsSearchEntry>();
		for (const entry of SETTINGS_SEARCH_INDEX) {
			merged.set(entry.id, entry);
		}
		for (const entry of this.liveEntries.values()) {
			merged.set(entry.id, entry);
		}
		return [...merged.values()];
	}

	matches(entry: SettingsSearchEntry, query: string): boolean {
		const haystack = `${entry.title} ${entry.description} ${entry.href}`.toLowerCase();
		return haystack.includes(query);
	}

	matchesMode(entry: SettingsSearchEntry, mode: MailViewMode): boolean {
		return !entry.modes || entry.modes.includes(mode);
	}

	filtered(): SettingsSearchEntry[] {
		const q = this.query.trim().toLowerCase();
		if (!q) return [];
		return this.allEntries()
			.filter((entry) => this.matchesMode(entry, settings.mailViewMode))
			.filter((entry) => this.matches(entry, q))
			.sort((a, b) => a.title.localeCompare(b.title))
			.slice(0, 12);
	}

	matchesRow(title: string, description?: string): boolean {
		const q = this.query.trim().toLowerCase();
		if (!q) return true;
		return `${title} ${description ?? ''}`.toLowerCase().includes(q);
	}

	scrollTo(id: string) {
		if (!browser) return;
		const el = document.getElementById(id);
		el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
		el?.classList.add('ring-2', 'ring-accent/40');
		setTimeout(() => el?.classList.remove('ring-2', 'ring-accent/40'), 2000);
	}
}

export const settingsSearch = new SettingsSearchRegistry();

export function settingsSearchSlug(title: string): string {
	return title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}
