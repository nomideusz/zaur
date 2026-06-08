<script lang="ts">
	import { DropdownMenu } from 'bits-ui';
	import ChevronDown from '$lib/components/icons/ChevronDown.svelte';
	import { LABEL_UNSEEN } from '$lib/mail/new-mail';
	import { mail } from '$lib/stores/mail.svelte';
	import { cn } from '$lib/utils/cn';
	import type { OverflowMenuPlacement } from '$lib/utils/overflow-menu-position';

	interface Props {
		disabled?: boolean;
		placement?: OverflowMenuPlacement;
		/** Compact text trigger for mobile shell bulk bar. */
		showLabel?: boolean;
		triggerClass?: string;
	}

	let {
		disabled = false,
		placement = 'bottom',
		showLabel = false,
		triggerClass = ''
	}: Props = $props();

	let open = $state(false);
	const side = $derived(placement === 'top' ? 'top' : 'bottom');
	const menuId = 'message-list-select-menu';

	function choose(filter: 'all' | 'normal' | 'new' | 'none') {
		open = false;
		mail.selectMessagesByFilter(filter);
	}
</script>

<DropdownMenu.Root bind:open>
	<DropdownMenu.Trigger
		aria-label="Selection options"
		aria-controls={menuId}
		class={cn(
			showLabel
				? 'inline-flex min-h-8 items-center gap-0.5 rounded-md px-1.5 py-1 text-sm font-medium text-fg-muted transition-colors hover:text-fg disabled:cursor-not-allowed disabled:opacity-60'
				: 'inline-flex min-h-8 items-center justify-center rounded-md px-2 py-1.5 text-fg-muted transition-colors hover:bg-surface-sunken/60 hover:text-fg disabled:cursor-not-allowed disabled:opacity-60',
			triggerClass
		)}
		{disabled}
	>
		{#if showLabel}
			<span>Select</span>
		{/if}
		<ChevronDown class="size-3.5 shrink-0" aria-hidden="true" />
	</DropdownMenu.Trigger>

	<DropdownMenu.Portal>
		<DropdownMenu.Content
			id={menuId}
			{side}
			align="start"
			sideOffset={8}
			collisionPadding={12}
			sticky="always"
			updatePositionStrategy="always"
			class="z-overflow-menu z-overflow-menu--fixed w-44 min-w-44 max-w-[calc(100vw-1rem)] py-1"
			onpointerdown={(event) => event.stopPropagation()}
		>
			<DropdownMenu.Group>
				<DropdownMenu.GroupHeading class="z-type-label px-3 py-1 text-[10px] uppercase tracking-wider text-fg-muted">
					Select
				</DropdownMenu.GroupHeading>
				<DropdownMenu.Item class="z-overflow-menu-item" textValue="All" onSelect={() => choose('all')}>
					All
				</DropdownMenu.Item>
				<DropdownMenu.Item
					class="z-overflow-menu-item"
					textValue="Normal"
					onSelect={() => choose('normal')}
				>
					Normal
				</DropdownMenu.Item>
				<DropdownMenu.Item
					class="z-overflow-menu-item"
					textValue={LABEL_UNSEEN}
					onSelect={() => choose('new')}
				>
					{LABEL_UNSEEN}
				</DropdownMenu.Item>
				<DropdownMenu.Item class="z-overflow-menu-item" textValue="None" onSelect={() => choose('none')}>
					Clear selection
				</DropdownMenu.Item>
			</DropdownMenu.Group>
		</DropdownMenu.Content>
	</DropdownMenu.Portal>
</DropdownMenu.Root>
