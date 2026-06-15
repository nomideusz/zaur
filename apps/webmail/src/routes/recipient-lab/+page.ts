import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';

// Isolated test fixture for ComposeRecipientInput (see tests/e2e/recipient-lab.spec.ts).
// Client-only, to match the real (app) compose route where the Ark tags-input machine
// hydrates correctly. Not reachable in production.
export const ssr = false;

export function load() {
	if (!dev) error(404);
}
