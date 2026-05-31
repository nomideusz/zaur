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

<div class="z-settings-panel w-full min-w-0 max-w-full">
	<div
		class={cn(
			'z-settings-stack',
			settings.compactSettingsPanel && 'z-settings-stack--compact'
		)}
	>
		{@render children()}
	</div>

	{#if footer}
		<footer
			class={cn(
				'z-settings-panel-footer',
				settings.compactSettingsPanel && 'z-settings-panel-footer--compact',
				settings.hidePaneBorders && 'border-transparent'
			)}
		>
			{@render footer()}
		</footer>
	{/if}
</div>
