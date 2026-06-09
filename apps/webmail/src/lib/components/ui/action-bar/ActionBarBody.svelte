<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

	interface Props {
		class?: string;
		children: Snippet;
	}

	let { class: className, children }: Props = $props();
</script>

<div
	class={cn('z-action-bar-body flex items-center gap-1', className)}
	data-slot="action-bar-body"
>
	{@render children()}
</div>
