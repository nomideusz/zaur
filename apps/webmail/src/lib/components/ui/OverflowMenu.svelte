<script lang="ts">
	import { browser } from '$app/environment';
	import MoreVertical from '$lib/components/icons/MoreVertical.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { OVERFLOW_MENU_CTX, type OverflowMenuContext } from '$lib/components/ui/overflow-menu-context';
	import { cn } from '$lib/utils/cn';
	import { portal } from '$lib/utils/portal';
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
	let triggerEl = $state<HTMLButtonElement | null>(null);
	let menuEl = $state<HTMLDivElement | null>(null);
	let resolvedPlacement = $state<'bottom' | 'top'>('bottom');
	let menuStyle = $state('');

	function setOpen(next: boolean) {
		open = next;
		onOpenChange?.(next);
		if (!next) {
			resolvedPlacement = 'bottom';
			menuStyle = '';
		}
	}

	function close() {
		setOpen(false);
	}

	function resolvePlacement(trigger: HTMLElement, menu: HTMLElement) {
		if (placement === 'top') return 'top' as const;
		if (placement === 'bottom') return 'bottom' as const;

		const rect = trigger.getBoundingClientRect();
		const menuHeight = menu.getBoundingClientRect().height || 240;
		const margin = 8;
		const spaceBelow = window.innerHeight - rect.bottom - margin;
		const spaceAbove = rect.top - margin;

		return spaceBelow >= menuHeight || spaceBelow >= spaceAbove ? ('bottom' as const) : ('top' as const);
	}

	function updateMenuPosition() {
		if (!browser || !triggerEl || !menuEl) return;

		const nextPlacement = resolvePlacement(triggerEl, menuEl);
		resolvedPlacement = nextPlacement;

		const rect = triggerEl.getBoundingClientRect();
		const menuRect = menuEl.getBoundingClientRect();
		const menuHeight = menuRect.height || 240;
		const menuWidth = menuRect.width || menuEl.offsetWidth || 208;
		const margin = 8;

		let top =
			nextPlacement === 'top' ? rect.top - menuHeight - margin : rect.bottom + margin;
		const right = Math.max(margin, window.innerWidth - rect.right);

		top = Math.max(margin, Math.min(top, window.innerHeight - menuHeight - margin));

		menuStyle = `top:${top}px;right:${right}px;left:auto;`;
	}

	function scheduleMenuPosition() {
		requestAnimationFrame(() => {
			updateMenuPosition();
			requestAnimationFrame(updateMenuPosition);
			requestAnimationFrame(updateMenuPosition);
		});
	}

	function toggleOpen(event: MouseEvent) {
		event.stopPropagation();
		const next = !open;
		if (!next) {
			close();
			return;
		}

		setOpen(true);
		scheduleMenuPosition();
	}

	function handleWindowClick(event: MouseEvent) {
		const target = event.target;
		if (!(target instanceof Node)) return;
		if (root?.contains(target) || menuEl?.contains(target)) return;
		close();
	}

	$effect(() => {
		if (!open || !browser) return;

		scheduleMenuPosition();

		const onViewportChange = () => updateMenuPosition();
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
		bind:ref={triggerEl}
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
			bind:this={menuEl}
			id={menuId}
			role="menu"
			tabindex="-1"
			use:portal
			class={cn('z-overflow-menu z-overflow-menu--fixed', menuClass)}
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
