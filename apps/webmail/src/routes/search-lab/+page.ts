import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';

// Isolated test fixture for the GlobalSearchCombobox prototype.
// Client-only so the Ark combobox machine hydrates correctly (matches the
// recipient-lab / folder-tree-lab pattern). Not reachable in production.
export const ssr = false;

export function load() {
	if (!dev) error(404);
}
