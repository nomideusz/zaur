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
	}

	let { disabled = false, placement = 'bottom' }: Props = $props();

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
			'inline-flex min-h-8 items-center justify-center rounded-md px-2 py-1.5 text-fg-muted transition-colors hover:bg-surface-sunken/60 hover:text-fg disabled:cursor-not-allowed disabled:opacity-60'
		)}
		{disabled}
	>
		<ChevronDown class="size-4 shrink-0" aria-hidden="true" />
	</DropdownMenu.Trigger>

	<DropdownMenu.Portal>
		<DropdownMenu.Content
			id={menuId}
			{side}
			align="start"
			sideOffset={8}
			collisionPadding={8}
			sticky="always"
			updatePositionStrategy="always"
			class="z-overflow-menu z-overflow-menu--fixed w-40 min-w-0 py-1"
			onpointerdown={(event) => event.stopPropagation()}
		>
			<DropdownMenu.Item class="z-overflow-menu-item" textValue="All" onSelect={() => choose('all')}>
				All
			</DropdownMenu.Item>
			<DropdownMenu.Item class="z-overflow-menu-item" textValue="Normal" onSelect={() => choose('normal')}>
				Normal
			</DropdownMenu.Item>
			<DropdownMenu.Item class="z-overflow-menu-item" textValue={LABEL_UNSEEN} onSelect={() => choose('new')}>
				{LABEL_UNSEEN}
			</DropdownMenu.Item>
			<DropdownMenu.Item class="z-overflow-menu-item" textValue="None" onSelect={() => choose('none')}>
				None
			</DropdownMenu.Item>
		</DropdownMenu.Content>
	</DropdownMenu.Portal>
</DropdownMenu.Root>
