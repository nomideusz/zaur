<script lang="ts">
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '$lib/utils/cn';

	let {
		title,
		description,
		children
	}: {
		title: string;
		description?: string;
		children: import('svelte').Snippet;
	} = $props();
</script>

<label
	class={cn(
		'flex items-center justify-between gap-4 rounded-lg border border-border',
		settings.compactSettingsRows ? 'px-3 py-2' : 'px-4 py-3',
		settings.hidePaneBorders && 'border-transparent'
	)}
>
	<div>
		<p class="text-sm font-medium text-fg">{title}</p>
		{#if description}
			<p class="text-xs text-fg-muted">{description}</p>
		{/if}
	</div>
	{@render children()}
</label>
