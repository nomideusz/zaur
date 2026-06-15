<script lang="ts">
	import { Tooltip } from '@ark-ui/svelte/tooltip';
	import { Portal } from '@ark-ui/svelte/portal';
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
	<!-- Ark tooltips are self-contained: each Root owns its open/close delay, so no
	     ancestor Provider is required (unlike bits-ui). `interactive` defaults to false
	     (≈ bits disableHoverableContent); `side` → positioning.placement, sideOffset → gutter. -->
	<Tooltip.Root openDelay={300} closeDelay={150} positioning={{ placement: side, gutter: 6 }}>
		<Tooltip.Trigger>
			{#snippet asChild(triggerProps)}
				{#if wrapDisabled}
					<span {...triggerProps()} class="inline-flex">
						{@render trigger({ props: {} })}
					</span>
				{:else}
					{@render trigger({ props: triggerProps() as Record<string, unknown> })}
				{/if}
			{/snippet}
		</Tooltip.Trigger>
		<Portal>
			<Tooltip.Positioner>
				<Tooltip.Content class={cn('z-tooltip', className)}>
					{label}
				</Tooltip.Content>
			</Tooltip.Positioner>
		</Portal>
	</Tooltip.Root>
{/if}
