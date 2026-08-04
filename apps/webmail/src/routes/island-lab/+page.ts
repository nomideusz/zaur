import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';

// Dev-only fixture for the floating island account rail + switcher sheet.
export const ssr = false;

export function load() {
	if (!dev) error(404);
}
