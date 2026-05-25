<script lang="ts">
	import { page } from '$app/stores';
	import { settings } from '$lib/stores/settings.svelte';
	import { hiddenSettingsCountForPage } from '$lib/settings/page-stats';
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

	const hiddenCount = $derived(
		settings.settingsDetailLevel === 'basic'
			? hiddenSettingsCountForPage($page.url.pathname)
			: 0
	);
</script>

<div class={cn('z-panel rounded-xl', settings.compactSettingsPanel ? 'p-4 md:p-5' : 'p-5 md:p-7')}>
	<div>
		<h2 class={cn('font-semibold text-fg', settings.compactSettingsPanel ? 'text-base' : 'text-lg md:text-xl')}>
			{title}
		</h2>
		{#if !settings.hideSettingsPanelDescriptions}
			<p class="mt-1 max-w-3xl text-sm text-fg-muted">{description}</p>
			{#if hiddenCount > 0}
				<p class="mt-1.5 text-xs text-fg-muted">
					{hiddenCount} more {hiddenCount === 1 ? 'option' : 'options'} in
					<button
						type="button"
						class="text-accent underline-offset-2 hover:underline"
						onclick={() => settings.setSettingsDetailLevel('advanced')}
					>
						All options
					</button>.
				</p>
			{/if}
		{/if}
	</div>
	<div
		class={cn(
			settings.compactSettingsPanel ? 'mt-4 space-y-6' : 'mt-6 space-y-8 md:mt-8 md:space-y-10',
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
