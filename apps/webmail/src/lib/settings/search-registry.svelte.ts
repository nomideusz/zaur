import { browser } from '$app/environment';
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

	filtered(): SettingsSearchEntry[] {
		const q = this.query.trim().toLowerCase();
		if (!q) return [];
		return this.allEntries()
			.filter((entry) => this.matches(entry, q))
			.sort((a, b) => a.title.localeCompare(b.title))
			.slice(0, 12);
	}

	/**
	 * Rows stay visible while searching — the combobox dropdown is the single place
	 * results are shown. (Filtering the page inline as well made every current-page
	 * match appear twice: once in the dropdown, once on the page behind it.)
	 */
	matchesRow(_title: string, _description?: string): boolean {
		return true;
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
