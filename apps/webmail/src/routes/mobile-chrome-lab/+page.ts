import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';

// Dev-only layout contract for mobile top bar + fullscreen reader (no auth).
export const ssr = false;

export function load() {
	if (!dev) error(404);
}
