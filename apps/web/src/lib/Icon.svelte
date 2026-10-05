<script lang="ts">
	// One stroke family for every icon on the page: 16px grid, 1.5 stroke, square caps.
	let { name }: { name: 'out' | 'down' | 'copy' | 'check' | 'search' } = $props();
</script>

<svg class="icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
	{#if name === 'out'}
		<path d="M5 3h8v8M13 3 3 13" />
	{:else if name === 'down'}
		<path d="M8 2v11M3.5 8.5 8 13l4.5-4.5" />
	{:else if name === 'copy'}
		<path d="M5.5 5.5h8v8h-8zM10.5 5.5v-3h-8v8h3" />
	{:else if name === 'check'}
		<path d="M2.5 8.5 6 12l7.5-8" />
	{:else}
		<path d="M7 12A5 5 0 1 0 7 2a5 5 0 0 0 0 10zM10.5 10.5 14 14" />
	{/if}
</svg>

<style>
	.icon {
		flex: none;
		width: 1em;
		height: 1em;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.5;
		stroke-linecap: square;
		vertical-align: -0.125em;
	}
</style>
