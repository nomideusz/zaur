<script lang="ts">
	import MoreVertical from '$lib/components/icons/MoreVertical.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { OVERFLOW_MENU_CTX, type OverflowMenuContext } from '$lib/components/ui/overflow-menu-context';
	import { cn } from '$lib/utils/cn';
	import { setContext } from 'svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		label?: string;
		menuId?: string;
		class?: string;
		children: Snippet;
	}

	let { label = 'More actions', menuId = 'overflow-menu', class: className = '', children }: Props = $props();

	let open = $state(false);
	let root = $state<HTMLDivElement | null>(null);

	function close() {
		open = false;
	}

	function handleWindowClick(event: MouseEvent) {
		const target = event.target;
		if (!(target instanceof Node) || root?.contains(target)) return;
		close();
	}

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
		onclick={(event) => {
			event.stopPropagation();
			open = !open;
		}}
	>
		<MoreVertical class="size-5" aria-hidden="true" />
	</IconButton>

	{#if open}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			id={menuId}
			role="menu"
			tabindex="-1"
			class="z-overflow-menu"
			onpointerdown={(event) => event.stopPropagation()}
			onkeydown={(event) => {
				if (event.key === 'Escape') close();
			}}
		>
			{@render children()}
		</div>
	{/if}
</div>
