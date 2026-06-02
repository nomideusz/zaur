<script lang="ts">
	import { browser } from '$app/environment';
import ChevronDown from '$lib/components/icons/ChevronDown.svelte';
	import MoreVertical from '$lib/components/icons/MoreVertical.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { OVERFLOW_MENU_CTX, type OverflowMenuContext } from '$lib/components/ui/overflow-menu-context';
	import { cn } from '$lib/utils/cn';
	import { overflowMenuFixedStyle, type OverflowMenuPlacement } from '$lib/utils/overflow-menu-position';
	import { portal } from '$lib/utils/portal';
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
	let root = $state<HTMLDivElement | null>(null);
	let triggerEl = $state<HTMLButtonElement | null>(null);
	let menuEl = $state<HTMLDivElement | null>(null);
	let menuStyle = $state('');

	function setOpen(next: boolean) {
		open = next;
		onOpenChange?.(next);
		if (!next) menuStyle = '';
	}

	function close() {
		setOpen(false);
	}

	function updateMenuPosition() {
		if (!browser || !triggerEl || !menuEl) return;
		menuStyle = overflowMenuFixedStyle(triggerEl, menuEl, placement);
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

<div bind:this={root} class={cn(textTrigger ? 'contents' : cn('relative shrink-0', className))}>
	{#if triggerText}
		<button
			bind:this={triggerEl}
			type="button"
			aria-label={label}
			aria-expanded={open}
			aria-controls={menuId}
			aria-haspopup="menu"
			class={cn(
				textTrigger
					? 'inline-flex items-baseline gap-0.5 border-0 bg-transparent p-0'
					: 'inline-flex min-h-8 items-center gap-1 rounded-sm px-2.5 py-1.5 text-sm text-fg-muted transition-colors hover:bg-surface-sunken/60 hover:text-fg',
				triggerClass
			)}
			onclick={toggleOpen}
		>
			<span>{triggerText}</span>
			<ChevronDown class={textTrigger ? 'size-3.5 shrink-0' : 'size-4'} aria-hidden="true" />
		</button>
	{:else}
		<IconButton
			bind:ref={triggerEl}
			{label}
			class={cn('!min-h-8 !min-w-8 !p-1.5', triggerClass)}
			ariaExpanded={open}
			ariaControls={menuId}
			ariaHaspopup="menu"
			onclick={toggleOpen}
		>
			<MoreVertical class="size-5" aria-hidden="true" />
		</IconButton>
	{/if}

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
