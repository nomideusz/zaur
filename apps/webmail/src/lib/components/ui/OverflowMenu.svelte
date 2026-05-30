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

	const opensUp = $derived(
		placement === 'top' || (placement === 'auto' && resolvedPlacement === 'top')
	);

	function setOpen(next: boolean) {
		open = next;
		onOpenChange?.(next);
		if (!next) resolvedPlacement = 'bottom';
	}

	function close() {
		setOpen(false);
	}

	function updateAutoPlacement() {
		if (!browser || !root || placement !== 'auto') return;

		const trigger = root.querySelector('button');
		const menu = root.querySelector('[role="menu"]');
		if (!trigger || !menu) return;

		const rect = trigger.getBoundingClientRect();
		const menuHeight = menu.getBoundingClientRect().height || 240;
		const margin = 8;
		const spaceBelow = window.innerHeight - rect.bottom - margin;
		const spaceAbove = rect.top - margin;

		resolvedPlacement = spaceBelow >= menuHeight || spaceBelow >= spaceAbove ? 'bottom' : 'top';
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
				updateAutoPlacement();
				requestAnimationFrame(updateAutoPlacement);
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

		const onViewportChange = () => updateAutoPlacement();
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
			class={cn('z-overflow-menu', opensUp && 'z-overflow-menu--top', menuClass)}
			onpointerdown={(event) => event.stopPropagation()}
			onkeydown={(event) => {
				if (event.key === 'Escape') close();
			}}
		>
			{@render children()}
		</div>
	{/if}
</div>
