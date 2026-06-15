<script lang="ts">
	import { Tooltip } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

	type Side = 'top' | 'right' | 'bottom' | 'left';

	interface Props {
		label: string;
		side?: Side;
		class?: string;
		/** Wrap the trigger in a span so tooltips work on disabled controls. */
		wrapDisabled?: boolean;
		trigger: Snippet<[{ props: Record<string, unknown> }]>;
	}

	let {
		label,
		side = 'top',
		class: className,
		wrapDisabled = false,
		trigger
	}: Props = $props();
</script>

{#if !label.trim()}
	{@render trigger({ props: {} })}
{:else}
	<!-- Self-contained: own Provider so a tooltip never depends on an ancestor
	     Tooltip.Provider. Without this, any trigger mounted outside the global
	     provider (e.g. a top-level overlay) crashes with "Context Tooltip.Provider
	     not found". Trade-off: cross-tooltip show-delay grouping is per-trigger. -->
	<Tooltip.Provider delayDuration={300} disableHoverableContent>
		<Tooltip.Root>
			<Tooltip.Trigger>
				{#snippet child({ props })}
					{#if wrapDisabled}
						<span {...props} class="inline-flex">
							{@render trigger({ props: {} })}
						</span>
					{:else}
						{@render trigger({ props })}
					{/if}
				{/snippet}
			</Tooltip.Trigger>
			<Tooltip.Portal>
				<Tooltip.Content {side} sideOffset={6} class={cn('z-tooltip', className)}>
					{label}
				</Tooltip.Content>
			</Tooltip.Portal>
		</Tooltip.Root>
	</Tooltip.Provider>
{/if}
