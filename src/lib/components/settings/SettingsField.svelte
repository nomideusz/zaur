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

<label class="block">
	<span class="text-sm font-medium text-fg">{title}</span>
	{#if description}
		<p class="mt-0.5 text-xs text-fg-muted">{description}</p>
	{/if}
	<div class={cn(settings.compactSettingsRows ? 'mt-1.5' : 'mt-2')}>
		{@render children()}
	</div>
</label>
