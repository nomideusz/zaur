<script lang="ts">
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

<div bind:this={containerRef} class={cn(!hasRows && 'hidden')}>
	<fieldset disabled={!enabled} class="min-w-0 border-0 p-0">
		{#if inactiveReason && hasRows}
			<p
				class={cn(
					'z-settings-depends-note',
					!enabled && 'z-settings-depends-note--muted'
				)}
			>
				{inactiveReason}
			</p>
		{/if}
		<div class={cn('z-settings-sublist', !enabled && 'opacity-55')}>
			{@render children()}
		</div>
	</fieldset>
</div>
