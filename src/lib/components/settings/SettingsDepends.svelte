<script lang="ts">
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '$lib/utils/cn';

	let {
		enabled = true,
		inactiveReason,
		children
	}: {
		/** When false, dependent controls are disabled and visually de-emphasized. */
		enabled?: boolean;
		/** Shown inside the group when disabled — explain why or what to change. */
		inactiveReason?: string;
		children: import('svelte').Snippet;
	} = $props();
</script>

<div class="col-span-full">
	<fieldset
		disabled={!enabled}
		class={cn(
			'min-w-0 rounded-lg border border-border/50 border-l-[3px] transition-opacity',
			enabled ? 'border-l-accent/50 bg-surface-sunken/30' : 'border-l-border bg-surface-sunken/15 opacity-55',
			settings.compactSettingsRows ? 'px-2.5 py-2' : 'px-3 py-2.5',
			'grid gap-3 lg:grid-cols-2 lg:gap-4 xl:gap-5'
		)}
	>
		{#if inactiveReason}
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
