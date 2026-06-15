<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { getContext } from 'svelte';
	import {
		ACTION_BAR_CTX,
		type ActionBarContext
	} from '$lib/components/ui/action-bar/action-bar-context';
	import { portal } from '$lib/utils/portal';
	import { cn } from '$lib/utils/cn';

	interface Props {
		class?: string;
		'aria-label'?: string;
		'aria-labelledby'?: string;
		children: Snippet;
	}

	let {
		class: className,
		'aria-label': ariaLabel,
		'aria-labelledby': ariaLabelledby,
		children
	}: Props = $props();

	const actionBar = getContext<ActionBarContext>(ACTION_BAR_CTX);
	const placement = $derived(actionBar.positioning.placement);
	const gutter = $derived(actionBar.positioning.gutter);
	const inline = $derived(actionBar.positioning.mode === 'inline');

	let mounted = $state(false);

	$effect(() => {
		if (!actionBar.lazyMount) {
			mounted = true;
			return;
		}
		if (actionBar.isOpen) mounted = true;
	});

	const show = $derived(mounted && (actionBar.isOpen || !actionBar.unmountOnExit));
</script>

{#if show && actionBar.isOpen}
	{#if inline}
		<div
			class="z-action-bar-positioner z-action-bar-positioner--inline flex shrink-0 justify-center px-4 max-md:hidden"
			data-placement="inline"
			data-slot="action-bar-positioner"
			data-state="open"
			in:fly={{ y: 8, duration: 200, easing: (t) => 1 - Math.pow(1 - t, 3) }}
			out:fade={{ duration: 120 }}
		>
			<div
				class={cn('z-action-bar-content pointer-events-auto', className)}
				role="toolbar"
				aria-label={ariaLabel}
				aria-labelledby={ariaLabelledby}
				data-slot="action-bar-content"
			>
				{@render children()}
			</div>
		</div>
	{:else}
		<div
			use:portal
			class={cn(
				'z-action-bar-positioner pointer-events-none fixed inset-x-0 bottom-0 z-50 flex px-4',
				placement === 'bottom' && 'justify-center',
				placement === 'bottom-start' && 'justify-start',
				placement === 'bottom-end' && 'justify-end'
			)}
			style={`--gutter: ${gutter}; padding-bottom: calc(var(--gutter) + env(safe-area-inset-bottom, 0px));`}
			data-placement={placement}
			data-slot="action-bar-positioner"
			data-state="open"
			in:fly={{ y: 16, duration: 240, easing: (t) => 1 - Math.pow(1 - t, 3) }}
			out:fade={{ duration: 150 }}
		>
			<div
				class={cn('z-action-bar-content pointer-events-auto', className)}
				role="toolbar"
				aria-label={ariaLabel}
				aria-labelledby={ariaLabelledby}
				data-slot="action-bar-content"
			>
				{@render children()}
			</div>
		</div>
	{/if}
{/if}
