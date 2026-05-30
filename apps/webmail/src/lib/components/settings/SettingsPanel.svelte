<script lang="ts">
	import { getWebmailModeContext } from '$lib/modes/context';
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

	const mode = $derived(getWebmailModeContext());
	const editorial = $derived(mode.settings.editorial);
</script>

<div class={cn('z-settings-panel', editorial && 'z-settings-panel--editorial')}>
	{#if !editorial}
		<header class={cn('max-md:hidden', settings.compactSettingsPanel ? 'mb-5' : 'mb-6')}>
			<h2 class="z-settings-page-title">{title}</h2>
			{#if !settings.hideSettingsPanelDescriptions}
				<p class="z-settings-page-lead">{description}</p>
			{/if}
		</header>
	{/if}

	<div
		class={cn(
			'z-settings-stack',
			settings.compactSettingsPanel && 'z-settings-stack--compact',
			editorial && 'z-settings-stack--editorial'
		)}
	>
		{@render children()}
	</div>

	{#if footer}
		<footer
			class={cn(
				'z-settings-panel-footer',
				settings.compactSettingsPanel && 'z-settings-panel-footer--compact',
				settings.hidePaneBorders && 'border-transparent',
				editorial && 'z-settings-panel-footer--editorial'
			)}
		>
			{@render footer()}
		</footer>
	{/if}
</div>
