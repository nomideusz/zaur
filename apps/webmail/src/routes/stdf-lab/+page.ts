import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';

// Dev-only spike: evaluating the STDF mobile component library against our
// own chrome. See docs/decisions/ if this ever becomes a real decision.
export const ssr = false;

export function load() {
	if (!dev) error(404);
}
