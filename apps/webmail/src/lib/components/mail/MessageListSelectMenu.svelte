<script lang="ts">
	import { browser } from '$app/environment';
	import ChevronDown from '$lib/components/icons/ChevronDown.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { overflowMenuFixedStyle, type OverflowMenuPlacement } from '$lib/utils/overflow-menu-position';
	import { portal } from '$lib/utils/portal';

	interface Props {
		disabled?: boolean;
		placement?: OverflowMenuPlacement;
	}

	let { disabled = false, placement = 'bottom' }: Props = $props();

	let open = $state(false);
	let root = $state<HTMLDivElement | null>(null);
	let triggerEl = $state<HTMLButtonElement | null>(null);
	let menuEl = $state<HTMLDivElement | null>(null);
	let menuStyle = $state('');

	const menuId = 'message-list-select-menu';

	function choose(filter: 'all' | 'normal' | 'new' | 'none') {
		open = false;
		menuStyle = '';
		mail.selectMessagesByFilter(filter);
	}

	function updateMenuPosition() {
		if (!browser || !triggerEl || !menuEl) return;
		menuStyle = overflowMenuFixedStyle(triggerEl, menuEl, placement);
	}

	function scheduleMenuPosition() {
		requestAnimationFrame(() => {
			updateMenuPosition();
			requestAnimationFrame(updateMenuPosition);
		});
	}

	function handleWindowClick(event: MouseEvent) {
		const target = event.target;
		if (!(target instanceof Node)) return;
		if (root?.contains(target) || menuEl?.contains(target)) return;
		open = false;
		menuStyle = '';
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
</script>

<svelte:window onclick={handleWindowClick} />

<div bind:this={root} class="relative shrink-0">
	<IconButton
		bind:ref={triggerEl}
		label="Selection options"
		class="!min-h-8 !min-w-8 !p-1.5"
		ariaExpanded={open}
		ariaControls={menuId}
		ariaHaspopup="menu"
		onclick={(event) => {
			if (disabled) return;
			event.stopPropagation();
			const next = !open;
			open = next;
			if (next) scheduleMenuPosition();
			else menuStyle = '';
		}}
	>
		<ChevronDown class="size-4 text-fg-subtle" aria-hidden="true" />
	</IconButton>

	{#if open}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			bind:this={menuEl}
			id={menuId}
			role="menu"
			tabindex="-1"
			use:portal
			class="z-overflow-menu z-overflow-menu--fixed w-40 min-w-0 py-1"
			style={menuStyle}
			onpointerdown={(event) => event.stopPropagation()}
			onkeydown={(event) => {
				if (event.key === 'Escape') {
					open = false;
					menuStyle = '';
				}
			}}
		>
			<button type="button" role="menuitem" class="z-overflow-menu-item" onclick={() => choose('all')}>
				All
			</button>
			<button type="button" role="menuitem" class="z-overflow-menu-item" onclick={() => choose('normal')}>
				Normal
			</button>
			<button type="button" role="menuitem" class="z-overflow-menu-item" onclick={() => choose('new')}>
				New
			</button>
			<button type="button" role="menuitem" class="z-overflow-menu-item" onclick={() => choose('none')}>
				None
			</button>
		</div>
	{/if}
</div>
