<script lang="ts">
	import { resolve } from '$app/paths';
	import { nf } from '#lib/format';
	import { reloading } from '#lib/reloading.svelte';
	import Bars from '#lib/components/Bars.svelte';

	let { data } = $props();
	reloading();

	const sum = (pick: (s: (typeof data.sites)[number]) => number) => data.sites.reduce((a, s) => a + pick(s), 0);
	const change = (s: { month: number; was: number | null }) => {
		if (s.was == null) return '—';
		if (s.was === 0) return s.month ? 'new' : '—';
		const p = Math.round((100 * (s.month - s.was)) / s.was);
		return `${p >= 0 ? '+' : '−'}${Math.abs(p)}%`;
	};
</script>

<svelte:head><title>Stats</title></svelte:head>

<div class="figs">
	<div><span class="fig">{nf.format(sum((s) => s.live))}</span><span class="fig-label">pages opened · 5 min</span></div>
	<div><span class="fig">{nf.format(sum((s) => s.today))}</span><span class="fig-label">today</span></div>
	<div><span class="fig">{nf.format(sum((s) => s.week))}</span><span class="fig-label">7 days</span></div>
	<div><span class="fig">{nf.format(sum((s) => s.month))}</span><span class="fig-label">30 days</span></div>
</div>

<div class="scroll" role="region" aria-label="Sites" tabindex="-1">
	<table>
		<thead>
			<tr>
				<th>Site</th>
				<th class="num">5 min</th>
				<th class="num">Today</th>
				<th class="num">7 days</th>
				<th class="num">30 days</th>
				<th class="num">vs before</th>
				<th class="trend">30 days, by day</th>
				<th></th>
			</tr>
		</thead>
		<tbody>
			{#each data.sites as s (s.id)}
				<tr>
					<td><a class="name" href={resolve('/s/[site]', { site: s.id })}>{s.name}</a></td>
					<td class="num" class:on={s.live}>{nf.format(s.live)}</td>
					<td class="num">{nf.format(s.today)}</td>
					<td class="num">{nf.format(s.week)}</td>
					<td class="num">{nf.format(s.month)}</td>
					<td class="num soft">{change(s)}</td>
					<td class="trend"><Bars bars={s.trend} unit="day" compact /></td>
					<td class="num"><a href={resolve('/s/[site]/live', { site: s.id })}>Live</a></td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.scroll {
		overflow-x: auto;
		background: var(--z-surface);
		border: 1px solid var(--z-hairline);
		border-radius: 10px;
	}
	table {
		width: 100%;
		min-width: 720px;
		border-collapse: collapse;
		font-size: 13px;
		color: var(--z-body);
	}
	th {
		padding: 8px 12px;
		font-size: 12px;
		font-weight: 600;
		text-align: left;
		color: var(--z-muted);
	}
	td {
		padding: 8px 12px;
		border-top: 1px solid var(--z-hairline);
		vertical-align: middle;
	}
	th.num {
		text-align: right;
	}
	td.num {
		text-align: right;
		white-space: nowrap;
		font-family: var(--font-mono);
		font-size: 12.5px;
	}
	.trend {
		width: 32%;
		min-width: 180px;
	}
	.name {
		font-weight: 600;
		color: var(--z-ink);
		text-decoration: none;
	}
	.name:hover {
		text-decoration: underline;
	}
	.soft {
		color: var(--z-soft);
	}
	.on {
		font-weight: 600;
		color: var(--z-accent-ink);
	}
	a {
		color: var(--z-link);
	}
</style>
