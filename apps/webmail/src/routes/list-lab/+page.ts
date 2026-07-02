import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';

// Dev-only fixture for the message-list row layout and mobile bulk-select
// (see tests/e2e/list-lab.spec.ts). Client-only like the real (app) list.
export const ssr = false;

export function load() {
	if (!dev) error(404);
}
