<script lang="ts">
	import './layout.css';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { nf } from '#lib/format';
	import { SITES } from '#lib/sites';
	import { PERIODS, readChart, readDays, readWho, viewHref, type Who } from '#lib/view';
	import SiteMenu from '#lib/components/SiteMenu.svelte';

	let { children, data } = $props();

	const site = $derived(page.params.site ?? null);
	const live = $derived(page.route.id?.endsWith('/live') ?? false);
	const who = $derived(readWho(page.url.searchParams));
	const days = $derived(readDays(page.url.searchParams));
	const chart = $derived(readChart(page.url.searchParams));
	const tagged = $derived(page.url.searchParams.has('tag'));
	const counts = $derived(page.data.counts as { mine: number; others: number } | undefined);
	// Only a period's chart has two ways to be drawn: not Live, the visit log or a tag's scattered days.
	const chartable = $derived(!live && !tagged && !!page.route.id && page.url.searchParams.get('view') !== 'visits');

	const whoes: [Who, string, () => number | undefined][] = [
		['others', 'Others', () => counts?.others],
		['mine', 'Mine', () => counts?.mine],
		['all', 'All', () => undefined]
	];
	const whoHref = (w: Who) => viewHref({ site, who: w, days, chart, live, extra: tagged ? { tag: page.url.searchParams.get('tag')! } : undefined });
	const cur = (on: boolean) => (on ? ('page' as const) : undefined);

	// The keys beside each entry in the site menu, wherever you are.
	function onkeydown(e: KeyboardEvent) {
		if (e.metaKey || e.ctrlKey || e.altKey) return;
		if ((e.target as HTMLElement).closest('input, select, textarea, [contenteditable]')) return;
		const key = e.key.toLowerCase();
		if (key === 'o') void goto(viewHref({ site: null, who, days, chart }));
		else if (key === 'a') void goto(viewHref({ site: 'all', who, days, chart, live }));
		else if (/^[0-9]$/.test(key)) {
			const to = SITES[key === '0' ? 9 : Number(key) - 1];
			if (to) void goto(viewHref({ site: to.id, who, days, chart, live }));
		}
	}
</script>

<svelte:window {onkeydown} />

<header>
	<a class="mark" href={viewHref({ site: null, who, days, chart })} aria-current={cur(!site)}>Stats</a>
	<SiteMenu {site} {who} {days} {chart} {live} order={data.arrangement.order} />
	<div class="filters">
		<nav class="seg" aria-label="Whose visits">
			{#each whoes as [w, label, n] (w)}
				<a href={whoHref(w)} aria-current={cur(who === w)}>{label}{#if n() != null}<span class="n count">{nf.format(n()!)}</span>{/if}</a>
			{/each}
		</nav>
		<nav class="seg" aria-label="Period">
			{#each PERIODS as [d, label] (d)}
				<a href={viewHref({ site, who, days: d, chart })} aria-current={cur(!live && !tagged && days === d)}>{label}</a>
			{/each}
			<a href={viewHref({ site, who, days, live: true })} aria-current={cur(live)}>Live</a>
		</nav>
		{#if chartable}
			<nav class="seg" aria-label="Chart">
				<a href={viewHref({ site, who, days, chart: 'pulse' })} aria-current={cur(chart === 'pulse')}>Pulse</a>
				<a href={viewHref({ site, who, days, chart: 'days' })} aria-current={cur(chart === 'days')}>{days === 1 ? 'By hour' : 'By day'}</a>
			</nav>
		{/if}
	</div>
	<form method="POST" action="/auth/logout">
		<button class="btn" type="submit">Sign out</button>
	</form>
</header>

<main>
	{@render children()}
</main>

<footer>
	<a href="https://db-ip.com" rel="noopener noreferrer">IP Geolocation by DB-IP</a>
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
		.filters {
			flex-direction: column;
			gap: 8px;
		}
	}
</style>
