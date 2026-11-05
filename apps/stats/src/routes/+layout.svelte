<script lang="ts">
	import './layout.css';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { nf, siteNo } from '#lib/format';
	import { SITES } from '#lib/sites';
	import { PERIODS, readDays, readWho, viewHref, type Who } from '#lib/view';

	let { children } = $props();

	const site = $derived(page.params.site ?? null);
	const live = $derived(page.route.id?.endsWith('/live') ?? false);
	const who = $derived(readWho(page.url.searchParams));
	const days = $derived(readDays(page.url.searchParams));
	const tagged = $derived(page.url.searchParams.has('tag'));
	const counts = $derived(page.data.counts as { mine: number; others: number } | undefined);

	const whoes: [Who, string, () => number | undefined][] = [
		['others', 'Others', () => counts?.others],
		['mine', 'Mine', () => counts?.mine],
		['all', 'All', () => undefined]
	];
	const whoHref = (w: Who) => viewHref({ site, who: w, days, live, extra: tagged ? { tag: page.url.searchParams.get('tag')! } : undefined });
	const cur = (on: boolean) => (on ? ('page' as const) : undefined);

	function chooseSite(e: Event) {
		const value = (e.currentTarget as HTMLSelectElement).value;
		void goto(viewHref({ site: value || null, who, days, live: live && !!value }));
	}

	// A site's number opens it, wherever you are.
	function onkeydown(e: KeyboardEvent) {
		if (e.metaKey || e.ctrlKey || e.altKey || !/^[0-9]$/.test(e.key)) return;
		const target = e.target as HTMLElement;
		if (target.closest('input, select, textarea, [contenteditable]')) return;
		const to = SITES[e.key === '0' ? 9 : Number(e.key) - 1];
		if (to) void goto(viewHref({ site: to.id, who, days, live }));
	}
</script>

<svelte:window {onkeydown} />

<header>
	<a class="mark" href={viewHref({ site: null, who, days })} aria-current={cur(!site)}>Stats</a>
	<select class="field" aria-label="Site" value={site === 'all' || SITES.some((s) => s.id === site) ? site : ''} onchange={chooseSite}>
		<option value="">Overview</option>
		<option value="all">All sites</option>
		{#each SITES as s (s.id)}
			<option value={s.id}>{siteNo(s.id)} {s.name}</option>
		{/each}
	</select>
	<div class="filters">
		<nav class="seg" aria-label="Whose visits">
			{#each whoes as [w, label, n] (w)}
				<a href={whoHref(w)} aria-current={cur(who === w)}>{label}{#if n() != null}<span class="n count">{nf.format(n()!)}</span>{/if}</a>
			{/each}
		</nav>
		<nav class="seg" aria-label="Period">
			{#each PERIODS as [d, label] (d)}
				<a href={viewHref({ site, who, days: d })} aria-current={cur(!live && !tagged && days === d)}>{label}</a>
			{/each}
			<a href={viewHref({ site, who, days, live: true })} aria-current={cur(live)}>Live</a>
		</nav>
	</div>
	<form method="POST" action="/auth/logout">
		<button class="btn" type="submit">Sign out</button>
	</form>
</header>

<main>
	{@render children()}
</main>

<footer>
	<span>Places and networks: <a href="https://db-ip.com" rel="noopener noreferrer">IP Geolocation by DB-IP</a>. Addresses are read to find them and never kept.</span>
	<span class="keys">Press a site's number to open it.</span>
</footer>

<style>
	header {
		display: flex;
		align-items: center;
		gap: 18px;
		padding: 9px var(--page-x);
		border-bottom: 1px solid var(--rule);
	}
	.mark {
		font-size: 15px;
		font-weight: 700;
		font-stretch: 125%;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		text-decoration: none;
	}
	.filters {
		display: flex;
		gap: 12px;
		margin-left: auto;
	}
	.n {
		margin-left: 6px;
		font-size: 11px;
		opacity: 0.85;
	}
	main {
		padding: 0 var(--page-x);
	}
	footer {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 4px 24px;
		padding: 16px var(--page-x) 24px;
		font-size: 12px;
		color: var(--soft);
	}
	@media (max-width: 1040px) {
		header {
			flex-wrap: wrap;
			gap: 10px;
		}
		.filters {
			order: 3;
			flex-basis: 100%;
			flex-wrap: wrap;
			margin-left: 0;
		}
		form {
			margin-left: auto;
		}
	}
	@media (max-width: 720px) {
		header select {
			flex: 1;
			min-width: 0;
		}
		.filters {
			flex-direction: column;
			gap: 8px;
		}
		.keys {
			display: none;
		}
	}
</style>
