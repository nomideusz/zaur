import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';

// Dev-only fixture for the phone bulk-select dock (MessageListBulkActionBar).
// Client-only like the real (app) list, and unreachable in production.
export const ssr = false;

export function load() {
	if (!dev) error(404);
}
