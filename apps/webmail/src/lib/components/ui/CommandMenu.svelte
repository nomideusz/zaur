<script lang="ts">
	import { Popover } from '@ark-ui/svelte/popover';
	import { Portal } from '@ark-ui/svelte/portal';
	import ChevronDown from '$lib/components/icons/ChevronDown.svelte';
	import { cn } from '$lib/utils/cn';
	import { focusFirstItem, rovingFocus } from '$lib/utils/roving-focus';
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

	type Align = 'start' | 'center' | 'end';
	type Placement = 'bottom' | `bottom-${'start' | 'end'}`;

	interface Props {
		label: string;
		menuId?: string;
		triggerText: string;
		triggerClass?: string;
		placeholder?: string;
		emptyText?: string;
		align?: Align;
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
	let listEl = $state<HTMLDivElement | null>(null);

	const placement = $derived<Placement>(align === 'center' ? 'bottom' : `bottom-${align}`);

	// Ark has no Command primitive, so the fuzzy filter bits-ui provided is replaced
	// with a case-insensitive token-substring match over label + keywords.
	function itemMatches(item: CommandMenuItem, query: string) {
		const q = query.trim().toLowerCase();
		if (!q) return true;
		const haystack = [item.label, ...(item.keywords ?? [])].join(' ').toLowerCase();
		return q.split(/\s+/).every((token) => haystack.includes(token));
	}

	const filteredGroups = $derived(
		groups
			.map((group) => ({
				...group,
				items: group.items.filter(
					(item) => item.label.trim().length > 0 && itemMatches(item, search)
				)
			}))
			.filter((group) => group.items.length > 0)
	);

	const hasResults = $derived(filteredGroups.length > 0);

	$effect(() => {
		if (!open) search = '';
	});

	function selectItem(item: CommandMenuItem) {
		if (item.disabled) return;
		open = false;
		item.onSelect();
	}
</script>

<Popover.Root
	{open}
	onOpenChange={(details) => (open = details.open)}
	positioning={{ placement, gutter: 8, overflowPadding: 12 }}
	ids={{ content: menuId }}
>
	<Popover.Trigger
		aria-label={label}
		class={cn('inline-flex items-center gap-1 border-0 bg-transparent', triggerClass)}
	>
		<span>{triggerText}</span>
		<ChevronDown class="size-3.5 shrink-0" aria-hidden="true" />
	</Popover.Trigger>

	<Portal>
		<Popover.Positioner>
			<Popover.Content
				class="z-command-menu z-overflow-menu z-overflow-menu--fixed w-72 min-w-64 max-w-[calc(100vw-1rem)] p-0"
				onpointerdown={(event) => event.stopPropagation()}
			>
				<div class="border-b border-border">
					<!-- svelte-ignore a11y_autofocus -->
					<input
						bind:value={search}
						{placeholder}
						aria-label={label}
						autofocus
						class="h-10 w-full bg-transparent px-3 text-sm text-fg outline-none placeholder:text-fg-subtle"
						onkeydown={(event) => {
							if (event.key === 'ArrowDown') {
								event.preventDefault();
								focusFirstItem(listEl);
							}
						}}
					/>
				</div>

				<div
					bind:this={listEl}
					role="listbox"
					aria-label={label}
					use:rovingFocus
					class="z-overflow-menu-scroll max-h-[min(50vh,20rem)] py-1"
				>
					{#if !hasResults}
						<p class="px-3 py-6 text-center text-sm text-fg-muted">{emptyText}</p>
					{:else}
						{#each filteredGroups as group, groupIndex (group.heading ?? group.items.map((item) => item.value).join('-'))}
							<div role="group">
								{#if group.heading}
									<div class="z-overflow-menu-label">{group.heading}</div>
								{/if}
								{#each group.items as item (item.value)}
									<button
										type="button"
										data-roving-item
										disabled={item.disabled}
										class={cn(
											'z-overflow-menu-item w-full text-left outline-none focus:bg-surface-sunken',
											item.danger && 'z-overflow-menu-item--danger'
										)}
										onclick={() => selectItem(item)}
									>
										{#if item.icon}
											<span class="flex size-5 shrink-0 items-center justify-center">
												{@render item.icon()}
											</span>
										{/if}
										<span class="truncate">{item.label}</span>
									</button>
								{/each}
							</div>
						{/each}
					{/if}
				</div>
			</Popover.Content>
		</Popover.Positioner>
	</Portal>
</Popover.Root>
