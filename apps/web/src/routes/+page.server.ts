// Package versions baked in at prerender, so the poster ships with real
// numbers; the page refreshes them from npm on load.
const names = ['zaur-world', 'svelte-calendar', 'svelte-search', 'svelte-i18n', 'svelte-geometrize', 'svelte-qr', 'svelte-media', 'svelte-scheduler', 'svelte-payments', 'svelte-notify'];

export async function load({ fetch }) {
	const pairs = await Promise.all(
		names.map((id) =>
			fetch(`https://registry.npmjs.org/@nomideusz/${id}/latest`)
				.then((r) => (r.ok ? r.json() : null))
				.then((j) => [id, j?.version] as const)
				.catch(() => [id, undefined] as const)
		)
	);
	return { versions: Object.fromEntries(pairs.filter(([, v]) => v)) as Record<string, string> };
}
