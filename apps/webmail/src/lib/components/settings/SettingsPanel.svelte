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

<div class="w-full max-w-[42rem] min-w-0">
	<header class={cn(settings.compactSettingsPanel ? 'mb-5' : 'mb-6')}>
		<h2
			class={cn(
				'font-semibold tracking-tight text-fg',
				settings.compactSettingsPanel ? 'text-lg' : 'text-xl'
			)}
		>
			{title}
		</h2>
		{#if !settings.hideSettingsPanelDescriptions}
			<p class="mt-1 max-w-prose text-sm text-fg-muted">{description}</p>
		{/if}
	</header>

	<div class={cn(settings.compactSettingsPanel ? 'space-y-6' : 'space-y-8')}>
		{@render children()}
	</div>

	{#if footer}
		<footer
			class={cn(
				settings.compactSettingsPanel ? 'mt-8 pt-5' : 'mt-10 pt-6',
				!settings.hidePaneBorders && 'border-t border-border'
			)}
		>
			{@render footer()}
		</footer>
	{/if}
</div>
