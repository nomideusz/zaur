<script lang="ts">
	import { cn } from '$lib/utils/cn';
	import type { Snippet } from 'svelte';

	interface Props {
		class?: string;
		children: Snippet;
	}

	let { class: className, children }: Props = $props();
</script>

<span class={cn('relative z-1', className)} data-slot="segment-group-item-text">
	{@render children()}
</span>
