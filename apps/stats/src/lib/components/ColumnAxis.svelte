<script lang="ts">
	// The dates under a row of columns, each centred on its own column.
	import { columnTicks } from '#lib/columns';

	let { days, from, slots }: { days: number; from: string; slots: number } = $props();
	const ticks = $derived(columnTicks(days, from));
	const tall = $derived(ticks.some((t) => t.over));
</script>

<div class="axis" class:tall aria-hidden="true">
	{#each ticks as t (t.i)}
		<span class:minor={t.minor} class:end={slots >= 30 && t.i >= slots - 3} style:left="{((t.i + 0.5) / slots) * 100}%">
			{#if t.over}<small>{t.over}</small>{/if}{t.label}
		</span>
	{/each}
</div>

<style>
	.axis {
		position: relative;
		height: 15px;
		font-family: var(--mono);
		font-size: 11px;
		font-weight: 400;
		line-height: 15px;
		color: var(--soft);
	}
	.axis.tall {
		height: 30px;
	}
	span {
		position: absolute;
		top: 0;
		transform: translateX(-50%);
		text-align: center;
		white-space: nowrap;
	}
	span.end {
		left: 100% !important;
		transform: translateX(-100%);
	}
	small {
		display: block;
		font: inherit;
	}
	@media (max-width: 720px) {
		.minor {
			display: none;
		}
	}
</style>
