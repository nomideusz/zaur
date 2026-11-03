<script lang="ts">
	// The square plus and minus of the page's folds, for a panel that only folds on
	// a phone. Above 900px it is gone, and the panel stands open.
	import { opened } from '#lib/opened.svelte';
	import { t } from '#lib/i18n';

	let { id, name }: { id: string; name: string } = $props();
</script>

<button type="button" aria-expanded={!!opened[id]} aria-label={t('packages.fold', { name })} onclick={() => (opened[id] = !opened[id])}>
	<svg viewBox="0 0 24 24" aria-hidden="true">
		<path d="M4 12h16" />
		{#if !opened[id]}<path d="M12 4v16" />{/if}
	</svg>
</button>

<style>
	button {
		display: none;
	}
	@media (max-width: 900px) {
		button {
			display: grid;
			flex: none;
			place-items: center;
			width: 2rem;
			height: 2rem;
			padding: 0;
			border: var(--rule) solid currentColor;
			background: none;
			color: inherit;
			cursor: pointer;
		}
		button:hover {
			background: var(--chip);
		}
		svg {
			width: 1rem;
			height: 1rem;
			fill: none;
			stroke: currentColor;
			stroke-width: 3;
		}
	}
	@media (max-width: 900px) and (pointer: coarse) {
		button {
			width: 2.75rem;
			height: 2.75rem;
		}
	}
</style>
