import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';

// Isolated test fixture for the sandboxed EmailHtmlFrame (see tests/e2e/email-frame-lab.spec.ts).
// Client-only so the iframe mounts and the parent measure/resize logic runs.
// Not reachable in production.
export const ssr = false;

export function load() {
	if (!dev) error(404);
}
