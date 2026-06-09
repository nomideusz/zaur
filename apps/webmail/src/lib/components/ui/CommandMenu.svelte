<script lang="ts">
	import { Command, Popover } from 'bits-ui';
	import ChevronDown from '$lib/components/icons/ChevronDown.svelte';
	import { cn } from '$lib/utils/cn';
	import type { Snippet } from 'svelte';

	export type CommandMenuItem = {
		value: string;
		label: string;
		keywords?: string[];
		icon?: Snippet;
		disabled?: boolean;
		danger?: boolean;
		onSelect: () => void;
	};

	export type CommandMenuGroup = {
		heading?: string;
		items: CommandMenuItem[];
	};

	interface Props {
		label: string;
		menuId?: string;
		triggerText: string;
		triggerClass?: string;
		placeholder?: string;
		emptyText?: string;
		align?: 'start' | 'center' | 'end';
		groups: CommandMenuGroup[];
	}

	let {
		label,
		menuId = 'command-menu',
		triggerText,
		triggerClass = '',
		placeholder = 'Filter…',
		emptyText = 'No results found.',
		align = 'start',
		groups
	}: Props = $props();

	let open = $state(false);
	let search = $state('');

	const visibleGroups = $derived(
		groups
			.map((group) => ({
				...group,
				items: group.items.filter((item) => item.label.trim().length > 0)
			}))
			.filter((group) => group.items.length > 0)
	);

	$effect(() => {
		if (!open) search = '';
	});

	function selectItem(item: CommandMenuItem) {
		if (item.disabled) return;
		open = false;
		item.onSelect();
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger
		aria-label={label}
		aria-controls={menuId}
		class={cn(
			'inline-flex items-center gap-1 border-0 bg-transparent',
			triggerClass
		)}
	>
		<span>{triggerText}</span>
		<ChevronDown class="size-3.5 shrink-0" aria-hidden="true" />
	</Popover.Trigger>

	<Popover.Portal>
		<Popover.Content
			id={menuId}
			{align}
			side="bottom"
			sideOffset={8}
			collisionPadding={12}
			sticky="always"
			updatePositionStrategy="always"
			class="z-command-menu z-overflow-menu z-overflow-menu--fixed w-72 min-w-64 max-w-[calc(100vw-1rem)] p-0"
			onpointerdown={(event) => event.stopPropagation()}
		>
			<Command.Root {label} loop class="flex w-full flex-col overflow-hidden">
				<div class="border-b border-border">
					<Command.Input
						bind:value={search}
						{placeholder}
						class="h-10 w-full bg-transparent px-3 text-sm text-fg outline-none placeholder:text-fg-subtle"
					/>
				</div>

				<Command.List class="z-overflow-menu-scroll max-h-[min(50vh,20rem)] py-1">
					<Command.Viewport>
						<Command.Empty class="px-3 py-6 text-center text-sm text-fg-muted">
							{emptyText}
						</Command.Empty>

						{#each visibleGroups as group, groupIndex (group.heading ?? group.items.map((item) => item.value).join('-'))}
							<Command.Group value={group.heading ?? `group-${groupIndex}`}>
								{#if group.heading}
									<Command.GroupHeading class="z-overflow-menu-label">
										{group.heading}
									</Command.GroupHeading>
								{/if}
								<Command.GroupItems>
									{#each group.items as item (item.value)}
										<Command.Item
											value={item.value}
											keywords={item.keywords ?? [item.label]}
											disabled={item.disabled}
											class={cn(
												'z-overflow-menu-item data-selected:bg-surface-sunken',
												item.danger && 'z-overflow-menu-item--danger'
											)}
											onSelect={() => selectItem(item)}
										>
											{#if item.icon}
												<span class="flex size-5 shrink-0 items-center justify-center">
													{@render item.icon()}
												</span>
											{/if}
											<span class="truncate">{item.label}</span>
										</Command.Item>
									{/each}
								</Command.GroupItems>
							</Command.Group>
						{/each}
					</Command.Viewport>
				</Command.List>
			</Command.Root>
		</Popover.Content>
	</Popover.Portal>
</Popover.Root>
