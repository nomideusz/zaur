<script lang="ts">
	// Whose visits and which period, in one row above every page of a site.
	import { resolve } from '$app/paths';
	import { nf } from '#lib/format';
	import type { Who } from '#lib/types';

	let {
		site,
		who,
		days,
		live = false,
		mine,
		others,
		note
	}: { site: string; who: Who; days?: number; live?: boolean; mine?: number; others?: number; note?: string } = $props();

	const PERIODS: [number, string][] = [
		[1, 'Today'],
		[7, '7 days'],
		[30, '30 days'],
		[90, '90 days']
	];
	const href = (over: { days?: number; who?: Who; live?: boolean }) => {
		const q = new URLSearchParams();
		const w = over.who ?? who;
		if (w !== 'others') q.set('who', w);
		const isLive = over.live ?? (over.days ? false : live);
		if (!isLive && (over.days ?? days ?? 30) !== 30) q.set('days', String(over.days ?? days));
		const qs = q.size ? `?${q}` : '';
		return isLive ? `${resolve('/s/[site]/live', { site })}${qs}` : `${resolve('/s/[site]', { site })}${qs}`;
	};
	const cur = (on: boolean) => (on ? ('page' as const) : undefined);
</script>

<div class="bar">
	<nav class="z-group" aria-label="Whose">
		<a class="z-segment" href={href({ who: 'others' })} aria-current={cur(who === 'others')}>Others{#if others != null}{' '}· {nf.format(others)}{/if}</a>
		<a class="z-segment" href={href({ who: 'mine' })} aria-current={cur(who === 'mine')}>Mine{#if mine != null}{' '}· {nf.format(mine)}{/if}</a>
		<a class="z-segment" href={href({ who: 'all' })} aria-current={cur(who === 'all')}>All</a>
	</nav>
	<nav class="z-group" aria-label="Period">
		{#each PERIODS as [d, label] (d)}
			<a class="z-segment" href={href({ days: d })} aria-current={cur(!live && days === d)}>{label}</a>
		{/each}
		<a class="z-segment" href={href({ live: true })} aria-current={cur(live)}>Live</a>
	</nav>
	{#if note}<span class="note">{note}</span>{/if}
</div>

<style>
	.bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px 12px;
		margin-bottom: 16px;
	}
	.note {
		font-size: 12.5px;
		color: var(--z-soft);
	}
	.z-group a {
		text-decoration: none;
	}
</style>
