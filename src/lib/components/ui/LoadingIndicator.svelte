<script lang="ts">
	import { LoaderCircle } from 'lucide-svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '$lib/utils/cn';

	let {
		label,
		compact = false,
		class: className = ''
	}: {
		label: string;
		compact?: boolean;
		class?: string;
	} = $props();
</script>

{#if settings.loadingIndicatorStyle === 'spinner'}
	<div
		class={cn(
			'flex items-center justify-center gap-2 text-fg-muted',
			compact ? 'px-3 py-4 text-xs' : 'px-4 py-8 text-sm',
			className
		)}
		aria-busy="true"
	>
		<LoaderCircle class={cn('animate-spin', compact ? 'size-3.5' : 'size-4')} aria-hidden="true" />
		<span>{label}</span>
	</div>
{:else}
	<p
		class={cn(
			'text-center text-fg-muted',
			compact ? 'px-3 py-4 text-xs' : 'px-4 py-8 text-sm',
			className
		)}
		aria-busy="true"
	>
		{label}
	</p>
{/if}
