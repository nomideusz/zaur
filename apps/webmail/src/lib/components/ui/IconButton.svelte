<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

	interface Props {
		label: string;
		class?: string;
		children: Snippet;
		onclick?: (e: MouseEvent) => void;
		ariaExpanded?: boolean;
		ariaControls?: string;
		ariaHaspopup?: 'menu' | 'listbox' | 'dialog' | 'true';
		ref?: HTMLButtonElement | null;
	}

	let {
		label,
		class: className,
		children,
		onclick,
		ariaExpanded,
		ariaControls,
		ariaHaspopup,
		ref = $bindable(null)
	}: Props = $props();
</script>

<button
	bind:this={ref}
	type="button"
	class={cn('z-btn-icon min-h-10 min-w-10 p-2.5', className)}
	aria-label={label}
	aria-expanded={ariaExpanded}
	aria-controls={ariaControls}
	aria-haspopup={ariaHaspopup}
	title={label}
	{onclick}
>
	{@render children()}
</button>
