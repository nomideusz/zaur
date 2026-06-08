<script lang="ts">
	import { DropdownMenu } from 'bits-ui';
	import ChevronDown from '$lib/components/icons/ChevronDown.svelte';
	import MoreVertical from '$lib/components/icons/MoreVertical.svelte';
	import { OVERFLOW_MENU_CTX, type OverflowMenuContext } from '$lib/components/ui/overflow-menu-context';
	import { cn } from '$lib/utils/cn';
	import type { OverflowMenuPlacement } from '$lib/utils/overflow-menu-position';
	import { setContext } from 'svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		label?: string;
		menuId?: string;
		placement?: OverflowMenuPlacement;
		triggerText?: string;
		/** Match text-nav links — no chrome padding or text-sm. */
		textTrigger?: boolean;
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
		triggerText = '',
		textTrigger = false,
		class: className = '',
		menuClass = '',
		triggerClass = '',
		onOpenChange,
		children
	}: Props = $props();

	let open = $state(false);
	const side = $derived(placement === 'top' ? 'top' : 'bottom');

	$effect(() => {
		onOpenChange?.(open);
	});

	function close() {
		open = false;
	}

	setContext<OverflowMenuContext>(OVERFLOW_MENU_CTX, { close });
</script>

<DropdownMenu.Root bind:open>
	<div class={cn(textTrigger ? 'contents' : cn('relative shrink-0', className))}>
		{#if triggerText}
			<DropdownMenu.Trigger
				aria-label={label}
				aria-controls={menuId}
				class={cn(
					textTrigger
						? 'inline-flex items-center gap-1 border-0 bg-transparent'
						: 'inline-flex min-h-8 items-center gap-1 rounded-md px-2.5 py-1.5 text-sm text-fg-muted transition-colors hover:bg-surface-sunken/60 hover:text-fg',
					triggerClass
				)}
			>
				<span>{triggerText}</span>
				<ChevronDown class={textTrigger ? 'size-3.5 shrink-0' : 'size-4'} aria-hidden="true" />
			</DropdownMenu.Trigger>
		{:else}
			<DropdownMenu.Trigger
				aria-label={label}
				aria-controls={menuId}
				class={cn('z-btn-icon min-h-8 min-w-8 p-1.5', triggerClass)}
			>
				<MoreVertical class="size-5" aria-hidden="true" />
			</DropdownMenu.Trigger>
		{/if}

		<DropdownMenu.Portal>
			<DropdownMenu.Content
				id={menuId}
				{side}
				align="end"
				sideOffset={8}
				collisionPadding={8}
				sticky="always"
				updatePositionStrategy="always"
				class={cn('z-overflow-menu z-overflow-menu--fixed', menuClass)}
				onpointerdown={(event) => event.stopPropagation()}
			>
				{@render children()}
			</DropdownMenu.Content>
		</DropdownMenu.Portal>
	</div>
</DropdownMenu.Root>
