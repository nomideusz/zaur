<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

	interface Props {
		count: number;
		label?: string;
		class?: string;
		children?: Snippet;
	}

	let { count, label, class: className, children }: Props = $props();
</script>

<span
	class={cn(
		'z-action-bar-value inline-flex shrink-0 items-center rounded-md bg-surface-sunken px-2 py-0.5 text-sm font-medium tabular-nums text-fg',
		className
	)}
	data-slot="action-bar-value"
>
	{#if children}
		{@render children()}
	{:else}
		{label ?? count}
	{/if}
</span>
