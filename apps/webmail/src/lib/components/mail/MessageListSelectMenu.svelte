<script lang="ts">
	import { Menu as ArkMenu } from '@ark-ui/svelte/menu';
	import ChevronDown from '$lib/components/icons/ChevronDown.svelte';
	import { Menu, MenuItem, MenuSurface, MenuTrigger } from '$lib/components/ui/menu';
	import { LABEL_UNSEEN } from '$lib/mail/new-mail';
	import { mail } from '$lib/stores/mail.svelte';
	import { cn } from '$lib/utils/cn';
	import type { OverflowMenuPlacement } from '$lib/utils/overflow-menu-position';
	import type { Snippet } from 'svelte';

	interface Props {
		disabled?: boolean;
		placement?: OverflowMenuPlacement;
		class?: string;
		/** Rendered inside the trigger before the chevron (e.g. the selection count). */
		children?: Snippet;
		/**
		 * Phone dock: pair a "Select all" / "Clear all" button with the filter
		 * chevron. The bare chevron alone gave no hint that it was tappable.
		 */
		split?: boolean;
		menuId?: string;
	}

	let {
		disabled = false,
		placement = 'bottom',
		class: className = '',
		children,
		split = false,
		menuId = 'message-list-select-menu'
	}: Props = $props();

	let open = $state(false);
	const side = $derived(placement === 'top' ? 'top' : 'bottom');

	const selectableCount = $derived(mail.selectableMessageList.length);
	const allSelected = $derived(selectableCount > 0 && mail.selectedCount >= selectableCount);

	function choose(filter: Parameters<typeof mail.selectMessagesByFilter>[0]) {
		mail.selectMessagesByFilter(filter);
	}

	function toggleAll() {
		if (allSelected) mail.deselectAll();
		else mail.selectMessagesByFilter('all');
	}
</script>

<Menu {side} align="start" {menuId} bind:open>
	{#if split}
		<div class="z-bulk-dock__select">
			<button
				type="button"
				class="z-bulk-dock__select-main"
				disabled={disabled || selectableCount === 0}
				onclick={toggleAll}
			>
				{allSelected ? 'Clear all' : 'Select all'}
			</button>
			<MenuTrigger
				aria-label="More selection options"
				class="z-bulk-dock__select-more"
				disabled={disabled || selectableCount === 0}
			>
				<ChevronDown class="size-4 shrink-0" aria-hidden="true" />
			</MenuTrigger>
		</div>
	{:else}
		<MenuTrigger
			aria-label="Selection options"
			class={cn('z-mail-list-select-trigger', className)}
			{disabled}
		>
			{#if children}{@render children()}{/if}
			<ChevronDown class="size-4 shrink-0" aria-hidden="true" />
		</MenuTrigger>
	{/if}

	<MenuSurface class="w-44 min-w-44 max-w-[calc(100vw-1rem)] py-1">
		<ArkMenu.ItemGroup>
			<ArkMenu.ItemGroupLabel
				class="z-type-label px-3 py-1 text-[10px] uppercase tracking-wider text-fg-muted"
			>
				Select
			</ArkMenu.ItemGroupLabel>
			<MenuItem label="All" value="all" onSelect={() => choose('all')} />
			<MenuItem label="Normal" value="normal" onSelect={() => choose('normal')} />
			<MenuItem label={LABEL_UNSEEN} value="new" onSelect={() => choose('new')} />
			<MenuItem label="Highlighted" value="important" onSelect={() => choose('important')} />
			<MenuItem label="Clear selection" value="none" onSelect={() => choose('none')} />
		</ArkMenu.ItemGroup>
	</MenuSurface>
</Menu>