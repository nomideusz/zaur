import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';

// Isolated test fixture for the Ark-toast-backed ToastStack.
// Client-only so the Ark toast machine hydrates (pause-on-hover, action click).
// Not reachable in production.
export const ssr = false;

export function load() {
	if (!dev) error(404);
}
