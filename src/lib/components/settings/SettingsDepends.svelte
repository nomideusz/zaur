<script lang="ts">
	import { settings } from '$lib/stores/settings.svelte';
	import { observeVisibleSettingsRows } from '$lib/settings/observe-visible-rows';
	import { settingsSearch } from '$lib/settings/search-registry.svelte';
	import { cn } from '$lib/utils/cn';

	let {
		enabled = true,
		inactiveReason,
		children
	}: {
		enabled?: boolean;
		inactiveReason?: string;
		children: import('svelte').Snippet;
	} = $props();

	let containerRef = $state<HTMLDivElement | null>(null);
	let hasRows = $state(false);

	$effect(() => {
		settings.settingsDetailLevel;
		settingsSearch.query;
		if (!containerRef) {
			hasRows = false;
			return;
		}

		return observeVisibleSettingsRows(containerRef, (next) => {
			hasRows = next;
		});
	});
</script>

<div bind:this={containerRef} class={cn('col-span-full', !hasRows && 'hidden')}>
	<fieldset
		disabled={!enabled}
		class={cn(
			'min-w-0 rounded-lg border border-border/60 transition-opacity',
			enabled ? 'bg-surface-sunken/25' : 'bg-surface-sunken/10 opacity-55',
			settings.compactSettingsRows ? 'px-2.5 py-2' : 'px-3 py-2.5',
			'grid gap-3 lg:grid-cols-2 lg:gap-4 xl:gap-5'
		)}
	>
		{#if inactiveReason && hasRows}
			<legend
				class={cn(
					'col-span-full max-w-none px-0 text-xs font-normal',
					enabled ? 'text-fg-muted' : 'text-fg-subtle'
				)}
			>
				{inactiveReason}
			</legend>
		{/if}
		{@render children()}
	</fieldset>
</div>
