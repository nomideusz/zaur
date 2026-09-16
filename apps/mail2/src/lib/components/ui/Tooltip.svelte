<script lang="ts">
	import { Tooltip as ArkTooltip } from '@ark-ui/svelte/tooltip';
	import { Portal } from '@ark-ui/svelte/portal';
	import type { Snippet } from 'svelte';

	interface Props {
		/** Side the tooltip appears on. */
		side?: 'top' | 'right' | 'bottom' | 'left';
		/** Skip the tooltip and render the trigger as-is when there is nothing extra to reveal. */
		disabled?: boolean;
		trigger: Snippet<[{ props: Record<string, unknown> }]>;
		children: Snippet;
	}

	let { side = 'bottom', disabled = false, trigger, children }: Props = $props();
</script>

{#if disabled}
	{@render trigger({ props: {} })}
{:else}
	<!-- Each Root owns its open/close delay, so no ancestor Provider is needed.
	     The trigger renders asChild: Ark merges its hover/focus handlers and
	     aria-describedby onto our element instead of adding a nested button. -->
	<ArkTooltip.Root
		openDelay={300}
		closeDelay={150}
		positioning={{ placement: side, gutter: 6 }}
		lazyMount
		unmountOnExit
	>
		<ArkTooltip.Trigger>
			{#snippet asChild(triggerProps)}
				{@render trigger({ props: triggerProps() as Record<string, unknown> })}
			{/snippet}
		</ArkTooltip.Trigger>
		<Portal>
			<ArkTooltip.Positioner>
				<ArkTooltip.Content
					class="max-w-[280px] rounded-[8px] border border-[#cbd5e1] bg-white px-2.5 py-2 shadow-lg"
				>
					{@render children()}
				</ArkTooltip.Content>
			</ArkTooltip.Positioner>
		</Portal>
	</ArkTooltip.Root>
{/if}
