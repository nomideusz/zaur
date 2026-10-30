<script module lang="ts">
	// Every daily chart on the page is linked by the date: pointing at a day in
	// one points at it in all, and their numbers switch to that day.
	export const linked = $state<{ day: string | null }>({ day: null });
</script>

<script lang="ts">
	// One bar a day, scaled to its own largest, the newest (or the day pointed
	// at) in orange. `line` draws an average position instead: a gap where a day
	// had none, and up is better, since position 1 is the top of Google.
	let { days, values, line = false }: { days: string[]; values: (number | null)[]; line?: boolean } = $props();

	const H = 20;
	const n = $derived(values.length);
	const at = $derived(linked.day ? days.indexOf(linked.day) : -1);
	const mark = $derived(at < 0 ? n - 1 : at);
	const top = $derived(Math.max(1, ...values.map((v) => v ?? 0)));
	const path = $derived.by(() => {
		const seen = values.filter((v) => v !== null);
		const lo = Math.min(...seen);
		const span = Math.max(...seen) - lo;
		const y = (p: number) => (span ? 2 + ((p - lo) / span) * (H - 4) : H / 2);
		return values
			.map((p, i) => {
				if (p === null) return '';
				const joined = i > 0 && values[i - 1] !== null;
				const lone = !joined && values[i + 1] == null;
				return `${joined ? 'L' : 'M'}${i + 0.5} ${y(p)}${lone ? 'h0.01' : ''}`;
			})
			.join('');
	});
	const point = (e: PointerEvent) => {
		const r = (e.currentTarget as SVGElement).getBoundingClientRect();
		const i = Math.floor(((e.clientX - r.left) / r.width) * n);
		linked.day = days[Math.min(n - 1, Math.max(0, i))];
	};
</script>

<svg viewBox="0 0 {n} {H}" preserveAspectRatio="none" aria-hidden="true" onpointermove={point} onpointerdown={point} onpointerleave={() => (linked.day = null)}>
	{#if line}
		<path d={path} />
		<line class="now" x1={mark + 0.5} x2={mark + 0.5} y1="0" y2={H} />
	{:else}
		{#each values as v, i (i)}
			{#if v}<rect class:now={i === mark} x={i + 0.15} y={H - Math.max(1, (v / top) * H)} width="0.7" height={Math.max(1, (v / top) * H)} />{/if}
		{/each}
		{#if !values[mark]}<line class="now" x1={mark + 0.5} x2={mark + 0.5} y1={H - 3} y2={H} />{/if}
	{/if}
</svg>

<style>
	svg {
		display: block;
		width: 100%;
		height: 1.25rem;
		overflow: visible;
		border-bottom: 1px solid color-mix(in srgb, var(--ink) 25%, transparent);
		/* a finger drags across the days; the page still scrolls up and down */
		touch-action: pan-y;
		cursor: crosshair;
	}
	rect {
		fill: var(--ink);
	}
	path {
		fill: none;
		stroke: var(--ink);
		stroke-width: 1.25;
		stroke-linecap: round;
		stroke-linejoin: round;
		vector-effect: non-scaling-stroke;
	}
	.now {
		fill: var(--orange);
		stroke: var(--orange);
		stroke-width: 2;
		vector-effect: non-scaling-stroke;
	}
</style>
