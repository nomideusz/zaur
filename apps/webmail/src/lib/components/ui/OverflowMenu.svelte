<script lang="ts">
	import ChevronDown from '$lib/components/icons/ChevronDown.svelte';
	import MoreVertical from '$lib/components/icons/MoreVertical.svelte';
	import { Menu, MenuSurface, MenuTrigger } from '$lib/components/ui/menu';
	import { cn } from '$lib/utils/cn';
	import type { OverflowMenuPlacement } from '$lib/utils/overflow-menu-position';
	import type { Snippet } from 'svelte';

	type Align = 'start' | 'center' | 'end';

	interface Props {
		label?: string;
		menuId?: string;
		placement?: OverflowMenuPlacement;
		align?: Align;
		triggerText?: string;
		/** Icon trigger with a screen-reader-only label below the `sm` breakpoint. */
		iconTriggerLabel?: string;
		/** Match text-nav links — no chrome padding or text-sm. */
		textTrigger?: boolean;
		/** Caret-only trigger — the second segment of a split button (e.g. Reply ▾). */
		caretTrigger?: boolean;
		class?: string;
		menuClass?: string;
		triggerClass?: string;
		onOpenChange?: (open: boolean) => void;
		children: Snippet;
	}

	let {
		label = 'More actions',
		menuId = 'overflow-menu',
		placement = 'bottom',
		align = 'end',
		triggerText = '',
		iconTriggerLabel = '',
		textTrigger = false,
		caretTrigger = false,
		class: className = '',
		menuClass = '',
		triggerClass = '',
		onOpenChange,
		children
	}: Props = $props();

	let open = $state(false);
	const side = $derived(placement === 'top' ? 'top' : 'bottom');
</script>

<!-- Composes ui/menu/* (Menu owns lazyMount/unmountOnExit + positioning); the
     content surface and item markup are shared, not re-implemented here. -->
<Menu
	{side}
	{align}
	{menuId}
	bind:open
	onOpenChange={(next) => onOpenChange?.(next)}
>
	<div class={cn(textTrigger || caretTrigger ? 'contents' : cn('relative shrink-0', className))}>
		{#if triggerText}
			<MenuTrigger
				aria-label={label}
				class={cn(
					textTrigger
						? 'inline-flex items-center gap-1 border-0 bg-transparent'
						: 'inline-flex min-h-8 items-center gap-1 rounded-md px-2.5 py-1.5 text-sm text-fg-muted transition-colors hover:bg-surface-sunken/60 hover:text-fg',
					triggerClass
				)}
			>
				<span>{triggerText}</span>
				<ChevronDown class={textTrigger ? 'size-3.5 shrink-0' : 'size-4'} aria-hidden="true" />
			</MenuTrigger>
		{:else if caretTrigger}
			<MenuTrigger
				aria-label={label}
				class={cn('z-split-caret inline-flex items-center justify-center', triggerClass)}
			>
				<ChevronDown class="size-4 shrink-0" aria-hidden="true" />
			</MenuTrigger>
		{:else}
			<MenuTrigger
				aria-label={label}
				class={cn(
					iconTriggerLabel ? 'inline-flex items-center gap-1.5' : 'z-btn-icon min-h-8 min-w-8 p-1.5',
					triggerClass
				)}
			>
				<MoreVertical class={iconTriggerLabel ? 'size-4' : 'size-5'} aria-hidden="true" />
				{#if iconTriggerLabel}
					<span class="max-sm:sr-only">{iconTriggerLabel}</span>
				{/if}
			</MenuTrigger>
		{/if}

		<MenuSurface class={cn('w-72 min-w-64 max-w-[calc(100vw-1rem)]', menuClass)}>
			{@render children()}
		</MenuSurface>
	</div>
</Menu>
