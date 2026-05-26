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
	}

	let {
		label,
		class: className,
		children,
		onclick,
		ariaExpanded,
		ariaControls,
		ariaHaspopup
	}: Props = $props();
</script>

<button
	type="button"
	class={cn('z-btn-ghost p-2', className)}
	aria-label={label}
	aria-expanded={ariaExpanded}
	aria-controls={ariaControls}
	aria-haspopup={ariaHaspopup}
	title={label}
	{onclick}
>
	{@render children()}
</button>
