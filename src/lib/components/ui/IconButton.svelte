<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

	interface Props {
		label: string;
		class?: string;
		children: Snippet;
		onclick?: (e: MouseEvent) => void;
	}

	let { label, class: className, children, onclick }: Props = $props();
</script>

<button
	type="button"
	class={cn('z-btn-ghost p-2', className)}
	aria-label={label}
	title={label}
	{onclick}
>
	{@render children()}
</button>
