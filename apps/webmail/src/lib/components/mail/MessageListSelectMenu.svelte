<script lang="ts">
	import { Menu } from '@ark-ui/svelte/menu';
	import { Portal } from '@ark-ui/svelte/portal';
	import ChevronDown from '$lib/components/icons/ChevronDown.svelte';
	import { LABEL_UNSEEN } from '$lib/mail/new-mail';
	import { mail } from '$lib/stores/mail.svelte';
	import { cn } from '$lib/utils/cn';
	import type { OverflowMenuPlacement } from '$lib/utils/overflow-menu-position';

	interface Props {
		disabled?: boolean;
		placement?: OverflowMenuPlacement;
		class?: string;
	}

	let { disabled = false, placement = 'bottom', class: className = '' }: Props = $props();

	let open = $state(false);
	const side = $derived(placement === 'top' ? 'top' : 'bottom');
	const menuId = 'message-list-select-menu';

	function choose(filter: 'all' | 'normal' | 'new' | 'none') {
		mail.selectMessagesByFilter(filter);
	}
</script>

<Menu.Root
	{open}
	onOpenChange={(details) => (open = details.open)}
	positioning={{ placement: `${side}-start`, gutter: 8, overflowPadding: 12 }}
	ids={{ content: menuId }}
	lazyMount
	unmountOnExit
>
	<Menu.Trigger
		aria-label="Selection options"
		class={cn('z-mail-list-select-trigger', className)}
		{disabled}
	>
		<ChevronDown class="size-4 shrink-0" aria-hidden="true" />
	</Menu.Trigger>

	<Portal>
		<Menu.Positioner>
			<Menu.Content
				class="z-overflow-menu z-overflow-menu--fixed w-44 min-w-44 max-w-[calc(100vw-1rem)] py-1"
				onpointerdown={(event) => event.stopPropagation()}
			>
				<Menu.ItemGroup>
					<Menu.ItemGroupLabel
						class="z-type-label px-3 py-1 text-[10px] uppercase tracking-wider text-fg-muted"
					>
						Select
					</Menu.ItemGroupLabel>
					<Menu.Item class="z-overflow-menu-item" value="all" valueText="All" onSelect={() => choose('all')}>
						All
					</Menu.Item>
					<Menu.Item
						class="z-overflow-menu-item"
						value="normal"
						valueText="Normal"
						onSelect={() => choose('normal')}
					>
						Normal
					</Menu.Item>
					<Menu.Item
						class="z-overflow-menu-item"
						value="new"
						valueText={LABEL_UNSEEN}
						onSelect={() => choose('new')}
					>
						{LABEL_UNSEEN}
					</Menu.Item>
					<Menu.Item
						class="z-overflow-menu-item"
						value="none"
						valueText="None"
						onSelect={() => choose('none')}
					>
						Clear selection
					</Menu.Item>
				</Menu.ItemGroup>
			</Menu.Content>
		</Menu.Positioner>
	</Portal>
</Menu.Root>
