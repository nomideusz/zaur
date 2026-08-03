<script lang="ts">
	import type { Snippet } from 'svelte';
	import { getContext } from 'svelte';
	import {
		ACTION_BAR_CTX,
		type ActionBarContext
	} from '$lib/components/ui/action-bar/action-bar-context';
	import { cn } from '$lib/utils/cn';

	interface Props {
		class?: string;
		children: Snippet;
		onclick?: (event: MouseEvent) => void;
		'aria-label'?: string;
	}

	let {
		class: className,
		children,
		onclick,
		'aria-label': ariaLabel = 'Close'
	}: Props = $props();

	const actionBar = getContext<ActionBarContext>(ACTION_BAR_CTX);

	function handleClick(event: MouseEvent) {
		actionBar.onClose();
		onclick?.(event);
	}
</script>

<button
	type="button"
	aria-label={ariaLabel}
	class={cn('z-action-bar-close z-btn-ghost', className)}
	data-slot="action-bar-close"
	data-state={actionBar.isOpen ? 'open' : 'closed'}
	onclick={handleClick}
>
	{@render children()}
</button>
