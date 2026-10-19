import { loadTemplates } from '#lib/templates';

// Package versions baked in at prerender, so the poster ships with real
// numbers; the page refreshes them from npm on load.
const names = ['zaur-world', 'svelte-calendar', 'svelte-search', 'svelte-i18n', 'svelte-geometrize', 'svelte-qr', 'svelte-media', 'svelte-scheduler', 'svelte-payments', 'svelte-notify'];

// The sites the page can show live: the flagships, the Zaur demos and the
// calendar's demo. Each is checked at prerender, and only one whose headers let
// zaur.app frame it gets a live window; the rest keep their capture.
const sites = ['https://szkolyjogi.pl', 'https://thebest.travel', 'https://demo.zaur.app', 'https://register.zaur.app', 'https://svelte-calendar.xyz'];

/** Whether these response headers let https://zaur.app put the page in a frame. */
export function _framable(h: Headers) {
	const ancestors = h.get('content-security-policy')?.match(/frame-ancestors([^;]*)/)?.[1];
	if (ancestors !== undefined) return /(^|\s)(\*|https:\/\/zaur\.app)(\s|$)/.test(ancestors);
	return !h.get('x-frame-options');
}

export async function load({ fetch }) {
	const [pairs, live, templates] = await Promise.all([
		Promise.all(
			names.map((id) =>
				fetch(`https://registry.npmjs.org/@nomideusz/${id}/latest`)
					.then((r) => (r.ok ? r.json() : null))
					.then((j) => [id, j?.version] as const)
					.catch(() => [id, undefined] as const)
			)
		),
		Promise.all(
			sites.map((href) =>
				fetch(href, { signal: AbortSignal.timeout(10_000) })
					.then((r) => (r.ok && _framable(r.headers) ? href : null))
					.catch(() => null)
			)
		),
		loadTemplates(fetch)
	]);
	return {
		versions: Object.fromEntries(pairs.filter(([, v]) => v)) as Record<string, string>,
		live: live.filter((h) => h !== null),
		templates
	};
}
