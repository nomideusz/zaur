<script lang="ts">
	// The dates under a period's plot, each centred on its own slot.
	import { columnTicks } from '#lib/columns';

	let { days, from, slots }: { days: number; from: string; slots: number } = $props();
	const ticks = $derived(columnTicks(days, from));
</script>

<div class="axis" aria-hidden="true">
	{#each ticks as t (t.i)}
		<span class:minor={t.minor} class:end={slots >= 30 && t.i >= slots - 3} style:left="{((t.i + 0.5) / slots) * 100}%">
			{#if t.over}<small>{t.over}</small>{' '}{/if}{t.label}
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
		font: inherit;
	}
	/* A weekday over its date, where one line would touch the next. */
	@media (max-width: 720px) {
		.axis {
			height: 30px;
		}
		small {
			display: block;
		}
		.minor {
			display: none;
		}
	}
</style>
