import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';

// Desktop floating-compose prototype (see /floating-compose-lab and FloatingComposeLab.svelte).
export const ssr = false;

export function load() {
	if (!dev) error(404);
}
