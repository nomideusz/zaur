<script lang="ts">
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '$lib/utils/cn';

	let {
		title,
		children
	}: {
		title: string;
		children: import('svelte').Snippet;
	} = $props();
</script>

<section class={cn(settings.compactSettingsRows ? 'space-y-3' : 'space-y-4')}>
	<h3 class="text-xs font-medium tracking-wide text-fg-subtle uppercase">{title}</h3>
	<div class={cn(settings.compactSettingsRows ? 'space-y-3' : 'space-y-4')}>
		{@render children()}
	</div>
</section>
