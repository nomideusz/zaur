<script lang="ts">
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '$lib/utils/cn';

	let {
		title,
		description,
		children,
		footer
	}: {
		title: string;
		description: string;
		children: import('svelte').Snippet;
		footer?: import('svelte').Snippet;
	} = $props();
</script>

<div class={cn('z-panel rounded-xl', settings.compactSettingsPanel ? 'p-4' : 'p-6')}>
	<h2 class={cn('font-semibold text-fg', settings.compactSettingsPanel ? 'text-base' : 'text-lg')}>{title}</h2>
	{#if !settings.hideSettingsPanelDescriptions}
		<p class="mt-1 text-sm text-fg-muted">{description}</p>
	{/if}
	<div
		class={cn(
			settings.compactSettingsPanel ? 'mt-4 space-y-6' : 'mt-6 space-y-8',
			settings.hideSettingsPanelDescriptions && (settings.compactSettingsPanel ? 'mt-3' : 'mt-4')
		)}
	>
		{@render children()}
	</div>
	{#if footer}
		<div
			class={cn(
				settings.compactSettingsPanel ? 'mt-6 pt-4' : 'mt-8 pt-6',
				!settings.hidePaneBorders && 'border-t border-border'
			)}
		>
			{@render footer()}
		</div>
	{/if}
</div>
