<script lang="ts">
	import { FocusTrap as ArkFocusTrap } from '@ark-ui/svelte/focus-trap';
	import type { FocusTrapProps } from '@ark-ui/svelte/focus-trap';
	import { cn } from '$lib/utils/cn';
	import type { Snippet } from 'svelte';

	type Props = {
		class?: string;
		children: Snippet;
	} & Omit<FocusTrapProps, 'asChild' | 'class'>;

	let { class: className, children, ...trapProps }: Props = $props();
</script>

<!--
	Ark FocusTrap attaches to an empty div unless composed with asChild.
	Merge trap behaviour onto the real container for sheets and slide-over panels.
-->
<ArkFocusTrap returnFocusOnDeactivate {...trapProps}>
	{#snippet asChild(propsFn)}
		<div {...propsFn()} class={cn(className)}>
			{@render children()}
		</div>
	{/snippet}
</ArkFocusTrap>
