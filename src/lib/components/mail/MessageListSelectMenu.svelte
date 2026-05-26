<script lang="ts">
	import { ChevronDown } from 'lucide-svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { mail } from '$lib/stores/mail.svelte';

	interface Props {
		disabled?: boolean;
	}

	let { disabled = false }: Props = $props();

	let open = $state(false);
	let root = $state<HTMLDivElement | null>(null);

	const menuId = 'message-list-select-menu';

	function choose(filter: 'all' | 'read' | 'unread' | 'none') {
		open = false;
		mail.selectMessagesByFilter(filter);
	}

	function handleWindowClick(event: MouseEvent) {
		const target = event.target;
		if (!(target instanceof Node) || root?.contains(target)) return;
		open = false;
	}
</script>

<svelte:window onclick={handleWindowClick} />

<div bind:this={root} class="relative shrink-0">
	<IconButton
		label="Selection options"
		class="!min-h-8 !min-w-8 !p-1.5"
		ariaExpanded={open}
		ariaControls={menuId}
		ariaHaspopup="menu"
		onclick={(event) => {
			if (disabled) return;
			event.stopPropagation();
			open = !open;
		}}
	>
		<ChevronDown class="size-4 text-fg-subtle" aria-hidden="true" />
	</IconButton>

	{#if open}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			id={menuId}
			role="menu"
			tabindex="-1"
			class="z-overflow-menu left-0 right-auto mt-1.5 w-40 min-w-0"
			onpointerdown={(event) => event.stopPropagation()}
			onkeydown={(event) => {
				if (event.key === 'Escape') open = false;
			}}
		>
			<button type="button" role="menuitem" class="z-overflow-menu-item" onclick={() => choose('all')}>
				All
			</button>
			<button type="button" role="menuitem" class="z-overflow-menu-item" onclick={() => choose('read')}>
				Read
			</button>
			<button type="button" role="menuitem" class="z-overflow-menu-item" onclick={() => choose('unread')}>
				Unread
			</button>
			<button type="button" role="menuitem" class="z-overflow-menu-item" onclick={() => choose('none')}>
				None
			</button>
		</div>
	{/if}
</div>
