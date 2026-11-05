<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import { invalidate } from '$app/navigation';
	import { moved as shifted } from '#lib/arrange';
	import { addDayStr, change, dayLabel, hourLabel, nf, opened } from '#lib/format';
	import { reloading } from '#lib/reloading.svelte';
	import { SOURCE_GROUPS } from '#lib/sources';
	import { periodName, viewHref } from '#lib/view';
	import ColumnAxis from '#lib/components/ColumnAxis.svelte';
	import Ridge from '#lib/components/Ridge.svelte';
	import SourceStrip from '#lib/components/SourceStrip.svelte';
	import { perWord } from './overview';

	let { data } = $props();
	reloading();

	type SiteRow = (typeof data.sites)[number];
	const sum = (pick: (s: SiteRow) => number) => data.sites.reduce((a, s) => a + pick(s), 0);
	const was = $derived(data.sites.every((s) => s.was != null) ? sum((s) => s.was ?? 0) : null);
	const period = $derived(periodName(data.days));
	const columns = $derived(data.chart === 'days');
	const here = $derived({ who: data.who, days: data.days, chart: data.chart });

	// The order on screen while a row is being moved, until the server has the new one.
	let order = $state<string[] | null>(null);
	let dragging = $state<string | null>(null);
	let failed = $state(false);
	let said = $state('');
	let body = $state<HTMLElement>();
	let saving: ReturnType<typeof setTimeout> | undefined;
	const rows = $derived(order ? order.map((id) => data.sites.find((s) => s.id === id)!) : data.sites);

	async function save(change: { order?: string[]; ranked?: boolean }) {
		const res = await fetch('/api/arrange', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(change) }).catch(() => null);
		failed = !res?.ok;
		await invalidate('stats:data');
		if (!saving) order = null;
	}
	function saveOrder(wait = 0) {
		clearTimeout(saving);
		saving = setTimeout(() => {
			saving = undefined;
			if (order) void save({ order, ranked: false });
		}, wait);
	}

	function grab(e: PointerEvent, id: string) {
		if (e.button !== 0) return;
		e.preventDefault();
		const start = rows.map((s) => s.id);
		order = start;
		dragging = id;
		tip = null;
		const move = (ev: PointerEvent) => {
			const all = [...(body?.children ?? [])];
			const over = all.findIndex((tr) => ev.clientY < tr.getBoundingClientRect().bottom);
			const to = over < 0 ? all.length - 1 : over;
			const from = order!.indexOf(id);
			if (to !== from) order = shifted(order!, from, to);
		};
		const drop = () => {
			removeEventListener('pointermove', move);
			removeEventListener('pointerup', drop);
			removeEventListener('pointercancel', drop);
			dragging = null;
			if (order!.join() === start.join()) order = null;
			else saveOrder();
		};
		addEventListener('pointermove', move);
		addEventListener('pointerup', drop);
		addEventListener('pointercancel', drop);
	}
	async function nudge(e: KeyboardEvent, s: SiteRow) {
		const by = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
		if (!by) return;
		e.preventDefault();
		const list = rows.map((r) => r.id);
		const from = list.indexOf(s.id);
		const to = from + by;
		if (to < 0 || to >= list.length) return;
		order = shifted(list, from, to);
		said = `${s.name} moved to place ${to + 1} of ${list.length}`;
		saveOrder(500);
		await tick();
		body?.querySelector<HTMLElement>(`[data-grip="${s.id}"]`)?.focus();
	}
	onDestroy(() => clearTimeout(saving));

	// The reading under the pointer, placed on the board rather than in the row, so
	// the next row's line can't cover it.
	let board = $state<HTMLElement>();
	let tip = $state<{ x: number; y: number; right: boolean; label: string; n: number; site: string; i: number } | null>(null);

	function readingLabel(i: number) {
		if (columns && data.days > 1) return dayLabel(addDayStr(data.from, i));
		const perDay = 24 / data.step;
		const day = addDayStr(data.from, Math.floor(i / perDay));
		const hour = (i % perDay) * data.step;
		return data.step === 1 ? `${dayLabel(day)}, ${hourLabel(hour)}` : `${dayLabel(day)}, ${hourLabel(hour)}–${hourLabel(hour + data.step)}`;
	}
	function read(e: PointerEvent, s: SiteRow) {
		if (dragging) return;
		const values = columns ? s.columns : s.pulse;
		const cell = e.currentTarget as HTMLElement;
		const box = cell.getBoundingClientRect();
		const outer = board!.getBoundingClientRect();
		const share = (e.clientX - box.left) / box.width;
		const i = columns ? Math.floor(share * data.columnSlots) : Math.round(share * (data.slots - 1));
		if (i < 0 || i >= values.length) {
			tip = null;
			return;
		}
		tip = {
			x: e.clientX - outer.left,
			y: (matchMedia('(max-width: 720px)').matches ? box.bottom : box.top) - outer.top,
			right: e.clientX - outer.left > outer.width / 2,
			label: readingLabel(i),
			n: values[i],
			site: s.id,
			i
		};
	}
	const clear = (e: PointerEvent) => {
		if (!(e.target as Element).closest('td.plot')) tip = null;
	};
	const ariaFor = (s: SiteRow) => {
		const top = Math.max(...s.pulse);
		return top ? `${s.name}: ${nf.format(s.count)} ${opened(s.count)}, at most ${nf.format(top)} in one reading` : `${s.name}: no pages opened in this period`;
	};
</script>

<svelte:window onpointerdown={clear} />

<svelte:head><title>Stats</title></svelte:head>

<h1 class="sr">Overview of every site</h1>
<p class="sr" aria-live="polite">{said}</p>

<div class="board" bind:this={board}>
	<table>
		<thead>
			<tr>
				<th class="site" scope="col">
					<button class="sort" class:on={!data.ranked} aria-pressed={!data.ranked} title="Your order" onclick={() => save({ ranked: false })}><span class="no">No.</span>Site</button>
				</th>
				<th class="plot" scope="col"><span class="sr">{period}, one line a site</span></th>
				<th class="num" scope="col" aria-sort={data.ranked ? 'descending' : undefined}>
					<button class="sort" class:on={data.ranked} aria-pressed={data.ranked} title="Rank by {period}" onclick={() => save({ ranked: true })}>
						{#if data.ranked}<svg viewBox="0 0 8 8" width="8" height="8" aria-hidden="true"><path d="M4 0v7M1 4.5 4 7.5 7 4.5" /></svg>{/if}{period}
					</button>
				</th>
				<th class="num" scope="col">vs before</th>
				<th class="num" scope="col">Today</th>
				<th class="num" scope="col" title="Pages opened in the last 5 minutes. Opens the live page.">Now</th>
			</tr>
		</thead>
		<tbody bind:this={body} class:dragging>
			{#each rows as s (s.id)}
				<tr class:moving={dragging === s.id}>
					<th class="site" scope="row">
						<button class="grip" type="button" data-grip={s.id} aria-label="Move {s.name}, with the up and down arrow keys" onpointerdown={(e) => grab(e, s.id)} onkeydown={(e) => nudge(e, s)}>
							<svg viewBox="0 0 8 14" width="8" height="14" aria-hidden="true"><path d="M0 0h2v2H0zM6 0h2v2H6zM0 6h2v2H0zM6 6h2v2H6zM0 12h2v2H0zM6 12h2v2H6z" /></svg>
						</button>
						<a href={viewHref({ ...here, site: s.id })}>
							<span class="no count">{String(s.no).padStart(2, '0')}</span>
							<span class="name">{s.name}</span>
						</a>
						<span class="sources"><SourceStrip rows={s.sources} /></span>
					</th>
					<td class="plot" onpointermove={(e) => read(e, s)} onpointerdown={(e) => read(e, s)} onpointerleave={(e) => { if (e.pointerType !== 'touch') tip = null; }}>
						{#if columns}
							<Ridge steps stems values={s.columns} slots={data.columnSlots} peak={data.columnPeak} label={ariaFor(s)} held={tip?.site === s.id ? tip.i : null} />
						{:else}
							<Ridge values={s.pulse} slots={data.slots} peak={data.peak} label={ariaFor(s)} />
						{/if}
					</td>
					<td class="num count strong" data-label={period}>{nf.format(s.count)}</td>
					<td class="num count soft" data-label="vs before">{change(s.count, s.was)}</td>
					<td class="num count" data-label="Today">{nf.format(s.today)}</td>
					<td class="num count" data-label="Now"><a class:on={s.live} href={viewHref({ ...here, site: s.id, live: true })} aria-label="{s.name}: {s.live} in the last 5 minutes, watch live">{nf.format(s.live)}</a></td>
				</tr>
			{/each}
		</tbody>
		<tfoot>
			<tr>
				<th class="site" scope="row"><a class="name" href={viewHref({ ...here, site: 'all' })}>All sites</a></th>
				<td class="plot">
					<div class="dates"><ColumnAxis days={data.days} from={data.from} slots={data.columnSlots} /></div>
					<ul class="legend">
						{#each SOURCE_GROUPS as g (g.id)}
							<li><i style:background="var(--src-{g.id})"></i>{g.label}</li>
						{/each}
						<li class="still push">still counting</li>
						<li title="A line's height is the square root of its count, so quiet sites keep their shape.">√ scale, tallest <b>{nf.format(columns ? data.columnPeak : data.peak)}</b> {columns ? (data.days === 1 ? 'an hour' : 'a day') : `in ${perWord(data.step)}`}</li>
					</ul>
					{#if failed}<p class="failed caption">The order wasn't saved. Try again.</p>{/if}
				</td>
				<td class="num count strong" data-label={period}>{nf.format(sum((s) => s.count))}</td>
				<td class="num count soft" data-label="vs before">{change(sum((s) => s.count), was)}</td>
				<td class="num count" data-label="Today">{nf.format(sum((s) => s.today))}</td>
				<td class="num count" data-label="Now"><a href={viewHref({ site: 'all', who: data.who, days: data.days, live: true })}>{nf.format(sum((s) => s.live))}</a></td>
			</tr>
		</tfoot>
	</table>
	{#if tip}
		<div class="tip" class:right={tip.right} style:left="{tip.x}px" style:top="{tip.y}px"><b>{nf.format(tip.n)}</b> {opened(tip.n)} · {tip.label}</div>
	{/if}
</div>

<style>
	.board {
		position: relative;
	}
	table {
		width: 100%;
		border-collapse: collapse;
	}
	/*
	 * Every row is the same height and every baseline stays put, drawn either way, ranked
	 * or not. The head sits right over the first name, and the first line rises past it,
	 * into the room the head leaves in the plot's column.
	 */
	thead th {
		height: 56px;
		padding: 0 0 2px;
		font-size: 12px;
		font-weight: 400;
		text-align: left;
		vertical-align: bottom;
		color: var(--soft);
	}
	thead .num {
		text-align: right;
	}
	.sort {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 0;
		font: inherit;
		color: inherit;
		background: none;
		border: 0;
		cursor: pointer;
	}
	.sort:hover {
		color: var(--ink);
		text-decoration: underline;
		text-underline-offset: 3px;
		text-decoration-thickness: 1px;
	}
	.sort.on {
		color: var(--ink);
	}
	.sort svg {
		fill: none;
		stroke: currentColor;
		stroke-width: 1.15px;
	}
	.sort .no {
		display: inline-block;
		margin-right: 7px;
		font-size: 12px;
		text-align: left;
		color: inherit;
	}
	.site {
		position: relative;
		width: 272px;
		text-align: left;
	}
	tbody .site,
	tfoot .site {
		padding: 0 16px 7px 0;
		vertical-align: bottom;
		font-weight: 400;
	}
	.site a {
		display: flex;
		align-items: baseline;
		gap: 12px;
		text-decoration: none;
	}
	.site a:hover .name {
		text-decoration: underline;
	}
	.no {
		width: 26px;
		font-size: 11px;
		color: var(--soft);
	}
	.name {
		font-size: 15px;
		font-weight: 500;
	}
	.sources {
		display: block;
		margin: 5px 0 0 38px;
	}
	/* In the page's margin, where it moves nothing when it appears. */
	.grip {
		position: absolute;
		top: 0;
		bottom: 0;
		left: calc(-1 * var(--page-x));
		display: flex;
		align-items: center;
		justify-content: center;
		width: var(--page-x);
		padding: 0;
		color: var(--soft);
		background: none;
		border: 0;
		cursor: grab;
		opacity: 0;
		touch-action: none;
		user-select: none;
	}
	.grip svg {
		fill: currentColor;
	}
	.grip:hover {
		color: var(--ink);
	}
	.grip:focus-visible {
		outline-offset: -4px;
		opacity: 1;
	}
	tr:hover .grip,
	.moving .grip {
		opacity: 1;
	}
	tbody tr {
		height: 65px;
	}
	tbody .plot {
		--rise: 112px;
		touch-action: pan-y;
	}
	/* The last line's zero lies on the rule under it, so a quiet site draws no second rule. */
	tbody tr:last-child {
		--lift: -1px;
	}
	.plot {
		position: relative;
		padding: 0;
	}
	tbody tr:is(:hover, :focus-within) {
		--line-weight: 2.4px;
	}
	tbody:has(tr:is(:hover, :focus-within)) tr:not(:hover, :focus-within) {
		--line-ink: var(--quiet-line);
	}
	.dragging {
		cursor: grabbing;
		user-select: none;
	}
	.dragging tr {
		--line-ink: var(--quiet-line) !important;
		--line-weight: 1.15px !important;
	}
	.dragging tr.moving {
		--line-ink: var(--ink) !important;
		--line-weight: 2.4px !important;
	}
	.dragging .grip {
		cursor: grabbing;
	}
	.num {
		width: 90px;
		text-align: right;
		white-space: nowrap;
	}
	tbody .num,
	tfoot .num {
		padding: 0 0 23px;
		vertical-align: bottom;
		font-size: 14px;
	}
	.num a {
		text-decoration: none;
	}
	.num a:hover {
		text-decoration: underline;
	}
	.on {
		font-weight: 600;
	}
	.sort.on {
		font-weight: 400;
	}
	.strong {
		font-weight: 500;
	}
	.soft {
		color: var(--soft);
	}
	tfoot tr {
		border-top: 1px solid var(--rule-strong);
	}
	tfoot .site,
	tfoot .num {
		padding-top: 14px;
		padding-bottom: 14px;
		vertical-align: top;
	}
	tfoot .plot {
		padding: 5px 0 14px;
		vertical-align: top;
	}
	.dates {
		margin-bottom: 8px;
	}
	.legend i {
		display: inline-block;
		width: 12px;
		height: 10px;
		margin-right: 6px;
	}
	.push {
		margin-left: auto;
	}
	.failed {
		margin: 6px 0 0;
	}
	.tip {
		margin-top: -4px;
	}

	@media (max-width: 1040px) {
		.site {
			width: 200px;
		}
		.num {
			width: 64px;
		}
		.name {
			font-size: 14px;
		}
		.push {
			margin-left: 0;
		}
	}

	/* On a phone each site is a short block: its line across the screen, the figures under it. */
	@media (max-width: 720px) {
		thead {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip-path: inset(50%);
		}
		table,
		tbody,
		tfoot {
			display: block;
		}
		tbody tr,
		tbody tr:last-child,
		tfoot tr {
			--lift: 0px;
			display: grid;
			grid-template-columns: repeat(3, 1fr) auto;
			align-items: baseline;
			height: auto;
			padding: 14px 0 12px;
			border-top: 1px solid var(--rule);
		}
		tfoot tr {
			border-top: 1px solid var(--rule-strong);
		}
		tbody .site,
		tfoot .site {
			display: flex;
			flex-wrap: wrap;
			align-items: baseline;
			gap: 6px 10px;
			grid-column: 1 / 4;
			width: auto;
			padding: 0;
		}
		.sources {
			margin: 0;
			align-self: center;
		}
		/* The order is set at a desk and followed here. */
		.grip {
			display: none;
		}
		tbody .plot,
		tfoot .plot {
			grid-column: 1 / -1;
			grid-row: 2;
			height: 58px;
			padding: 0;
			--rise: 58px;
		}
		tfoot .plot {
			height: auto;
			padding: 10px 0;
		}
		.tip {
			margin-top: 2px;
		}
		td.num,
		tfoot .num {
			display: block;
			width: auto;
			padding: 6px 0 0;
			text-align: left;
			font-size: 13px;
		}
		td.num::before {
			content: attr(data-label) ' ';
			font: 400 12px var(--sans);
			color: var(--soft);
		}
		/* The period's count sits beside the name, at the end of the first line. */
		td.strong {
			grid-column: 4;
			grid-row: 1;
			padding: 0;
			text-align: right;
			font-size: 15px;
		}
		td.strong::before {
			content: none;
		}
	}
</style>
