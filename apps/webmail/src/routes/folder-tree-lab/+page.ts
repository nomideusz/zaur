import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';

// Dev-only fixture for the custom-folder tree-view (see tests/e2e/folder-tree-lab.spec.ts).
// Client-only, to match the real (app) sidebar where the Ark tree-view machine hydrates.
export const ssr = false;

export function load() {
	if (!dev) error(404);
}
