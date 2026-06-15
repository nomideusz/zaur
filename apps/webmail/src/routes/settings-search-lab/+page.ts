import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';

// Isolated test fixture for the SettingsSearch combobox.
// Client-only so the Ark combobox machine hydrates correctly (matches the
// search-lab / recipient-lab / folder-tree-lab pattern). Not reachable in production.
export const ssr = false;

export function load() {
	if (!dev) error(404);
}
