<script lang="ts">
	import { browser } from '$app/environment';
	import MoreVertical from '$lib/components/icons/MoreVertical.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { OVERFLOW_MENU_CTX, type OverflowMenuContext } from '$lib/components/ui/overflow-menu-context';
	import { cn } from '$lib/utils/cn';
	import { setContext } from 'svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		label?: string;
		menuId?: string;
		placement?: 'bottom' | 'top' | 'auto';
		class?: string;
		menuClass?: string;
		onOpenChange?: (open: boolean) => void;
		children: Snippet;
	}

	let {
		label = 'More actions',
		menuId = 'overflow-menu',
		placement = 'bottom',
		class: className = '',
		menuClass = '',
		onOpenChange,
		children
	}: Props = $props();

	let open = $state(false);
	let root = $state<HTMLDivElement | null>(null);
	let resolvedPlacement = $state<'bottom' | 'top'>('bottom');
	let menuStyle = $state('');

	const useFixedPlacement = $derived(placement === 'auto');

	function setOpen(next: boolean) {
		open = next;
		onOpenChange?.(next);
		if (!next) {
			menuStyle = '';
			resolvedPlacement = 'bottom';
		}
	}

	function close() {
		setOpen(false);
	}

	function updateAutoPosition() {
		if (!browser || !root || placement !== 'auto') return;

		const trigger = root.querySelector('button');
		const menu = root.querySelector('[role="menu"]');
		if (!trigger || !menu) return;

		const rect = trigger.getBoundingClientRect();
		const menuRect = menu.getBoundingClientRect();
		const margin = 8;
		const gap = 4;
		const menuHeight = menuRect.height > 0 ? menuRect.height : 240;
		const menuWidth = menuRect.width > 0 ? menuRect.width : 208;

		const spaceBelow = window.innerHeight - rect.bottom - margin;
		const spaceAbove = rect.top - margin;
		const openDown = spaceBelow >= menuHeight || spaceBelow >= spaceAbove;
		resolvedPlacement = openDown ? 'bottom' : 'top';

		let top = openDown ? rect.bottom + gap : rect.top - menuHeight - gap;
		top = Math.max(margin, Math.min(top, window.innerHeight - menuHeight - margin));

		let left = rect.right - menuWidth;
		left = Math.max(margin, Math.min(left, window.innerWidth - menuWidth - margin));

		menuStyle = `top:${top}px;left:${left}px;width:${menuWidth}px;`;
	}

	function toggleOpen(event: MouseEvent) {
		event.stopPropagation();
		const next = !open;
		if (!next) {
			close();
			return;
		}

		setOpen(true);
		if (placement === 'auto') {
			requestAnimationFrame(() => {
				updateAutoPosition();
				requestAnimationFrame(updateAutoPosition);
			});
		}
	}

	function handleWindowClick(event: MouseEvent) {
		const target = event.target;
		if (!(target instanceof Node) || root?.contains(target)) return;
		close();
	}

	$effect(() => {
		if (!open || placement !== 'auto' || !browser) return;

		const onViewportChange = () => updateAutoPosition();
		window.addEventListener('resize', onViewportChange);
		window.addEventListener('scroll', onViewportChange, true);
		return () => {
			window.removeEventListener('resize', onViewportChange);
			window.removeEventListener('scroll', onViewportChange, true);
		};
	});

	setContext<OverflowMenuContext>(OVERFLOW_MENU_CTX, { close });
</script>

<svelte:window onclick={handleWindowClick} />

<div bind:this={root} class={cn('relative shrink-0', className)}>
	<IconButton
		{label}
		class="!min-h-8 !min-w-8 !p-1.5"
		ariaExpanded={open}
		ariaControls={menuId}
		ariaHaspopup="menu"
		onclick={toggleOpen}
	>
		<MoreVertical class="size-5" aria-hidden="true" />
	</IconButton>

	{#if open}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			id={menuId}
			role="menu"
			tabindex="-1"
			class={cn(
				'z-overflow-menu',
				useFixedPlacement && 'z-overflow-menu--fixed',
				!useFixedPlacement && placement === 'top' && 'z-overflow-menu--top',
				menuClass
			)}
			style={menuStyle}
			onpointerdown={(event) => event.stopPropagation()}
			onkeydown={(event) => {
				if (event.key === 'Escape') close();
			}}
		>
			{@render children()}
		</div>
	{/if}
</div>
