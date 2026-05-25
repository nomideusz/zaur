<script lang="ts">
	import { settings } from '$lib/stores/settings.svelte';
	import { shouldShowSetting } from '$lib/settings/detail-level';
	import { cn } from '$lib/utils/cn';

	let {
		title,
		description,
		advanced,
		children
	}: {
		title: string;
		description?: string;
		/** Force hide in essential mode, or force show when true with advanced false. */
		advanced?: boolean;
		children: import('svelte').Snippet;
	} = $props();

	const visible = $derived(
		shouldShowSetting(settings.settingsDetailLevel, { advanced, title })
	);
</script>

{#if visible}
	<label
		class={cn(
			'flex min-w-0 items-center justify-between gap-4 rounded-lg border border-border',
			settings.compactSettingsRows ? 'px-3 py-2' : 'px-4 py-3',
			settings.hidePaneBorders && 'border-transparent',
			'[&:has(:disabled)]:cursor-not-allowed'
		)}
	>
		<div class="min-w-0 flex-1">
			<p class="text-sm font-medium text-fg">{title}</p>
			{#if description}
				<p class="text-xs text-fg-muted">{description}</p>
			{/if}
		</div>
		<div class="shrink-0">{@render children()}</div>
	</label>
{/if}
