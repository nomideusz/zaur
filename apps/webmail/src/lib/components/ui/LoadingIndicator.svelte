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
			compact ? 'px-3 py-4 text-xs' : 'px-4 py-10 text-sm',
			className
		)}
		aria-busy="true"
	>
		<span class={cn('z-spinner rounded-full bg-accent/10 p-1 text-accent', compact ? 'size-6' : 'size-7')} aria-hidden="true">
			<LoaderCircle class="size-full" />
		</span>
		<span class="font-medium">{label}</span>
	</div>
{:else}
	<p
		class={cn(
			'text-center font-medium text-fg-muted',
			compact ? 'px-3 py-4 text-xs' : 'px-4 py-10 text-sm',
			className
		)}
		aria-busy="true"
	>
		{label}
	</p>
{/if}
