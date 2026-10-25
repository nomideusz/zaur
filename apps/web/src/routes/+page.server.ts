import { loadTemplates } from '#lib/templates';
import { loadUsage } from '#lib/usage';

// Package versions baked in at prerender, so the poster ships with real
// numbers; the page refreshes them from npm on load. The rest of what a
// developer weighs before installing (license, Svelte range, dependencies)
// comes from the same call.
const names = ['zaur-world', 'svelte-calendar', 'svelte-search', 'svelte-i18n', 'svelte-geometrize', 'svelte-qr', 'svelte-media', 'svelte-scheduler', 'svelte-payments', 'svelte-notify'];

// The sites the page can show live: the flagships and the Zaur demos. Each is checked at prerender, and only one whose headers let
// zaur.app frame it gets a live window; the rest keep their capture.
const sites = ['https://szkolyjogi.pl', 'https://thebest.travel', 'https://demo.zaur.app', 'https://register.zaur.app'];

/** Whether these response headers let https://zaur.app put the page in a frame. */
export function _framable(h: Headers) {
	const ancestors = h.get('content-security-policy')?.match(/frame-ancestors([^;]*)/)?.[1];
	if (ancestors !== undefined) return /(^|\s)(\*|https:\/\/zaur\.app)(\s|$)/.test(ancestors);
	return !h.get('x-frame-options');
}

// Every language's page is prerendered from the same numbers: one round of
// npm, site and GitHub calls per build, not one per language (GitHub search
// allows ten unauthenticated calls a minute).
let shared: ReturnType<typeof gather> | undefined;
export const load = ({ fetch }) => (shared ??= gather(fetch));

async function gather(fetch: typeof globalThis.fetch) {
	const [pairs, live, templates, usage] = await Promise.all([
		Promise.all(
			names.map((id) =>
				fetch(`https://registry.npmjs.org/@nomideusz/${id}/latest`)
					.then((r) => (r.ok ? r.json() : null))
					.then((j) => [id, j?.version, j && { license: j.license as string | undefined, svelte: j.peerDependencies?.svelte as string | undefined, deps: Object.keys(j.dependencies ?? {}).length }] as const)
					.catch(() => [id, undefined, undefined] as const)
			)
		),
		Promise.all(
			sites.map((href) =>
				fetch(href, { signal: AbortSignal.timeout(10_000) })
					.then((r) => (r.ok && _framable(r.headers) ? href : null))
					.catch(() => null)
			)
		),
		loadTemplates(fetch),
		// Which packages each product imports, read from its repo; a product
		// missing here keeps the list written in +page.svelte.
		loadUsage(names)
	]);
	return {
		versions: Object.fromEntries(pairs.filter(([, v]) => v)) as Record<string, string>,
		meta: Object.fromEntries(pairs.filter(([, , m]) => m).map(([id, , m]) => [id, m!])),
		live: live.filter((h) => h !== null),
		templates,
		uses: usage.uses,
		// The version each product runs, from its lockfile ('workspace' when built from source).
		usedVersions: usage.versions
	};
}
