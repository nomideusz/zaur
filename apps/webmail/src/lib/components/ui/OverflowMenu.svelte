<script lang="ts">
	import { Menu } from '@ark-ui/svelte/menu';
	import { Portal } from '@ark-ui/svelte/portal';
	import ChevronDown from '$lib/components/icons/ChevronDown.svelte';
	import MoreVertical from '$lib/components/icons/MoreVertical.svelte';
	import { cn } from '$lib/utils/cn';
	import type { OverflowMenuPlacement } from '$lib/utils/overflow-menu-position';
	import type { Snippet } from 'svelte';

	type Align = 'start' | 'center' | 'end';
	type Placement = 'top' | 'bottom' | `top-${'start' | 'end'}` | `bottom-${'start' | 'end'}`;

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
	const arkPlacement = $derived<Placement>(align === 'center' ? side : `${side}-${align}`);
</script>

<!-- Mount content on open / unmount on close (bits-ui behaviour). Ark defaults to
     eager mount + keep-mounted, which mounts every row's menu hidden and tears its
     `$derived` reads down with the component on navigation (derived_inert warnings). -->
<Menu.Root
	{open}
	onOpenChange={(details) => {
		open = details.open;
		onOpenChange?.(details.open);
	}}
	positioning={{ placement: arkPlacement, gutter: 8, overflowPadding: 12 }}
	ids={{ content: menuId }}
	lazyMount
	unmountOnExit
>
	<div class={cn(textTrigger || caretTrigger ? 'contents' : cn('relative shrink-0', className))}>
		{#if triggerText}
			<Menu.Trigger
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
			</Menu.Trigger>
		{:else if caretTrigger}
			<Menu.Trigger
				aria-label={label}
				class={cn('z-split-caret inline-flex items-center justify-center', triggerClass)}
			>
				<ChevronDown class="size-4 shrink-0" aria-hidden="true" />
			</Menu.Trigger>
		{:else}
			<Menu.Trigger
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
			</Menu.Trigger>
		{/if}

		<Portal>
			<Menu.Positioner>
				<Menu.Content
					class={cn(
						'z-overflow-menu z-overflow-menu--fixed w-72 min-w-64 max-w-[calc(100vw-1rem)]',
						menuClass
					)}
					onpointerdown={(event) => event.stopPropagation()}
				>
					{@render children()}
				</Menu.Content>
			</Menu.Positioner>
		</Portal>
	</div>
</Menu.Root>
