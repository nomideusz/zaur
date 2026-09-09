import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';

// Dev-only fixture for the header account rail. Client-only and unreachable in
// production, like the other labs.
export const ssr = false;

export function load() {
	if (!dev) error(404);
}
