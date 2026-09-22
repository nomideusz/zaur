<script lang="ts">
	import { tick } from 'svelte';
	import { Menu } from '@ark-ui/svelte/menu';
	import { Portal } from '@ark-ui/svelte/portal';
	import type { MailboxDTO } from '#lib/mail/types';
	import type { ListRow } from '#lib/mail/rows';
	import type { BulkAction, ListFilter } from '../../../routes/mail.remote';
	import { COUNT_BADGE, mailboxChannel } from '#lib/mail/colors';
	import AccountMenu from './AccountMenu.svelte';
	import ActionIcon from './ActionIcon.svelte';

	/**
	 * The phone's one bar. The shell header and the list header would otherwise
	 * stack, and a selection would stack a third idea under them. This row wears
	 * whichever of the three the screen is in, at 44px targets: browsing (folder,
	 * select, filter, search, compose, account), searching, or acting on a
	 * selection. It sits above the panes, so the folder drawer cannot cover the
	 * control that dismisses it.
	 */
	interface Props {
		class?: string;
		mailboxes: MailboxDTO[] | undefined;
		activeMailbox: MailboxDTO | null;
		sidebarOpen?: boolean;
		onToggleSidebar?: () => void;
		searchQuery?: string;
		onSearch?: (query: string) => void;
		filter: ListFilter;
		onFilter: (value: ListFilter) => void;
		rows: ListRow[];
		selection: Set<string>;
		onSetSelection: (ids: Set<string>) => void;
		onBulk: (action: BulkAction, mailboxId?: string) => void;
		busy?: boolean;
		onNewMessage: (anchor: { left: number; top: number; right: number; bottom: number }) => void;
	}

	let {
		class: className = '',
		mailboxes,
		activeMailbox,
		sidebarOpen = false,
		onToggleSidebar,
		searchQuery = '',
		onSearch,
		filter,
		onFilter,
		rows,
		selection,
		onSetSelection,
		onBulk,
		busy = false,
		onNewMessage
	}: Props = $props();

	let searchEl = $state<HTMLInputElement | null>(null);
	/**
	 * What is typed. A committed query from outside replaces it; typing sticks
	 * until that happens.
	 */
	let draft = $derived(searchQuery);
	/** The field was asked for. A committed query keeps it open on its own. */
	let searchWanted = $state(false);

	const searchOpen = $derived(searchWanted || searchQuery.length > 0);
	const selectedRows = $derived(rows.filter((row) => selection.has(row.threadId)));
	const allRead = $derived(selectedRows.length > 0 && selectedRows.every((row) => !row.unread));
	const allStarred = $derived(selectedRows.length > 0 && selectedRows.every((row) => row.starred));
	const moveTargets = $derived(
		(mailboxes ?? []).filter((box) => box.id !== activeMailbox?.id && box.kind !== 'drafts')
	);
	const archiveTarget = $derived(
		(mailboxes ?? []).find((box) => box.kind === 'archive' && box.id !== activeMailbox?.id)
	);
	const filterLabel = $derived(filter === 'unseen' ? 'Unseen' : filter === 'flagged' ? 'Flagged' : 'All');

	export async function focusSearch() {
		searchWanted = true;
		await tick();
		searchEl?.focus();
	}

	function commitSearch() {
		onSearch?.(draft.trim());
	}

	function closeSearch() {
		draft = '';
		searchWanted = false;
		onSearch?.('');
	}

	function selectAll() {
		onSetSelection(new Set(rows.map((row) => row.threadId)));
	}

	function selectNone() {
		onSetSelection(new Set());
	}

	function selectWhere(predicate: (row: ListRow) => boolean) {
		onSetSelection(new Set(rows.filter(predicate).map((row) => row.threadId)));
	}

	const FILTERS: { value: ListFilter; label: string }[] = [
		{ value: 'all', label: 'All' },
		{ value: 'unseen', label: 'Unseen' },
		{ value: 'flagged', label: 'Flagged' }
	];
</script>

{#snippet selectMenu()}
	<Menu.Root positioning={{ placement: 'bottom-start', gutter: 6, overflowPadding: 12 }} lazyMount unmountOnExit>
		<Menu.Trigger
			class="btn-tactile size-11 shrink-0 p-0 {selection.size > 0 ? '!border-[var(--z-accent-line)]' : ''}"
			aria-label="Selection options"
		>
			<span class="hobday-checkbox" data-checked={selection.size > 0} aria-hidden="true"></span>
		</Menu.Trigger>
		<Portal>
			<Menu.Positioner>
				<Menu.Content class="z-menu z-40 w-[200px]">
					<div class="z-menu-caption">Select</div>
					<Menu.Item value="all" onSelect={selectAll} class="z-menu-item min-h-11">All</Menu.Item>
					<Menu.Item value="none" onSelect={selectNone} class="z-menu-item min-h-11">None</Menu.Item>
					<Menu.Item value="unseen" onSelect={() => selectWhere((row) => row.unread)} class="z-menu-item min-h-11">Unseen</Menu.Item>
					<Menu.Item value="seen" onSelect={() => selectWhere((row) => !row.unread)} class="z-menu-item min-h-11">Seen</Menu.Item>
					<Menu.Item value="flagged" onSelect={() => selectWhere((row) => row.starred)} class="z-menu-item min-h-11">Flagged</Menu.Item>
				</Menu.Content>
			</Menu.Positioner>
		</Portal>
	</Menu.Root>
{/snippet}

<header
	class="flex h-14 shrink-0 items-center gap-1 border-b px-1.5 select-none md:hidden {selection.size > 0
		? 'border-[var(--z-accent-stroke)] bg-[var(--z-accent-soft)]'
		: 'border-[var(--z-line)] bg-[var(--z-surface)]'} {className}"
	aria-label={selection.size > 0 ? `${selection.size} selected` : 'Mail'}
>
	{#if selection.size > 0}
		{@render selectMenu()}
		<span class="shrink-0 px-0.5 text-[15px] font-semibold text-[var(--z-accent-ink)] tabular-nums">
			{selection.size}
		</span>
		<div class="z-group ml-auto shrink-0 !border-[var(--z-accent-line)]" role="group" aria-label="Selection actions">
			<button
				type="button"
				class="z-icon-btn size-11 {allStarred ? '!text-[var(--z-ch-flagged-solid)]' : ''}"
				disabled={busy}
				aria-label={allStarred ? 'Remove flag' : 'Flag'}
				onclick={() => onBulk(allStarred ? 'unstar' : 'star')}
			>
				<ActionIcon name={allStarred ? 'star-filled' : 'star'} class="size-[18px]" />
			</button>
			<button
				type="button"
				class="z-icon-btn size-11"
				disabled={busy}
				aria-label={allRead ? 'Mark unread' : 'Mark read'}
				onclick={() => onBulk(allRead ? 'unread' : 'read')}
			>
				<ActionIcon name={allRead ? 'mail' : 'mail-open'} class="size-[18px]" />
			</button>
			{#if archiveTarget}
				<button
					type="button"
					class="z-icon-btn size-11"
					disabled={busy}
					aria-label="Archive"
					onclick={() => onBulk('move', archiveTarget.id)}
				>
					<ActionIcon name="archive" class="size-[18px]" />
				</button>
			{/if}
			<button
				type="button"
				class="z-icon-btn size-11 hover:!bg-[var(--z-ch-discard-hover)] hover:!text-[var(--z-ch-discard-solid)] {activeMailbox?.kind === 'trash'
					? '!text-[var(--z-ch-discard-solid)]'
					: ''}"
				disabled={busy}
				aria-label={activeMailbox?.kind === 'trash' ? 'Delete forever' : 'Delete'}
				onclick={() => onBulk('delete')}
			>
				<ActionIcon name="trash" class="size-[18px]" />
			</button>
		</div>
		{#if moveTargets.length > 0}
			<Menu.Root positioning={{ placement: 'bottom-end', gutter: 6, overflowPadding: 12 }} lazyMount unmountOnExit>
				<Menu.Trigger
					class="btn-tactile size-11 shrink-0 p-0 !border-[var(--z-accent-line)] !text-[var(--z-accent-ink)] max-[379px]:hidden"
					disabled={busy}
					aria-label="Move to"
				>
					<svg class="size-[18px]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
						<path d="M2.5 8h8M8 4.5L11.5 8 8 11.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
						<path d="M9.5 3.5h3a1 1 0 011 1v7a1 1 0 01-1 1h-3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
					</svg>
				</Menu.Trigger>
				<Portal>
					<Menu.Positioner>
						<Menu.Content class="z-menu z-40 max-h-[320px] w-56 overflow-y-auto">
							<div class="z-menu-caption">Move to</div>
							{#each moveTargets as target (target.id)}
								{@const channel = mailboxChannel(target.kind)}
								<Menu.Item value={target.id} onSelect={() => onBulk('move', target.id)} class="z-menu-item min-h-11">
									<span class="inline-block size-2.5 shrink-0 rounded-[3px] border" style:background-color={channel.fill} style:border-color={channel.stroke} aria-hidden="true"></span>
									<span class="truncate">{target.name}</span>
								</Menu.Item>
							{/each}
						</Menu.Content>
					</Menu.Positioner>
				</Portal>
			</Menu.Root>
		{/if}
		<button
			type="button"
			class="btn-tactile size-11 shrink-0 p-0 !border-[var(--z-accent-line)] !text-[var(--z-accent-ink)]"
			onclick={selectNone}
			aria-label="Clear selection"
		>
			<svg class="size-[18px]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
				<path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
			</svg>
		</button>
	{:else if searchOpen && onSearch}
		<button type="button" class="btn-tactile size-11 shrink-0 p-0" aria-label="Close search" onclick={closeSearch}>
			<svg class="size-5 text-[var(--z-strong)]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
				<path d="M10 3.5L5.5 8 10 12.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
		</button>
		<div class="relative min-w-0 flex-1">
			<input
				bind:this={searchEl}
				bind:value={draft}
				type="search"
				inputmode="search"
				enterkeyhint="search"
				autocomplete="off"
				autocapitalize="off"
				autocorrect="off"
				spellcheck="false"
				aria-label="Search mail"
				placeholder={activeMailbox ? `Search ${activeMailbox.name}…` : 'Search mail…'}
				class="z-field h-11 w-full pr-11 pl-3 text-base"
				onkeydown={(event) => {
					if (event.key === 'Enter') {
						event.preventDefault();
						commitSearch();
					} else if (event.key === 'Escape') {
						event.preventDefault();
						closeSearch();
					}
				}}
			/>
			{#if draft || searchQuery}
				<button
					type="button"
					class="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-[8px] text-[var(--z-strong)]"
					aria-label="Clear search"
					onclick={() => {
						draft = '';
						onSearch('');
						searchEl?.focus();
					}}
				>
					<svg class="size-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
						<path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
					</svg>
				</button>
			{/if}
		</div>
		<AccountMenu class="!size-11 shrink-0 rounded-[10px] text-[13px]" />
	{:else}
		<div class="flex min-w-0 flex-1 items-center gap-1">
		{#if onToggleSidebar}
			<button
				type="button"
				class="flex h-11 min-w-0 items-center gap-1.5 rounded-[10px] pr-1.5 pl-1 text-left text-[var(--z-ink)] active:bg-[var(--z-hover)]"
				aria-expanded={sidebarOpen}
				aria-label="{activeMailbox?.name ?? 'Folder'}. {sidebarOpen ? 'Close folder list' : 'Open folder list'}"
				onclick={onToggleSidebar}
			>
				<svg class="size-5 shrink-0 text-[var(--z-strong)]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
					{#if sidebarOpen}<rect x="2" y="2.5" width="4" height="11" rx="2" fill="currentColor" opacity="0.35" />{/if}
					<rect x="2" y="2.5" width="12" height="11" rx="2" stroke="currentColor" stroke-width="1.3" />
					<line x1="6" y1="2.5" x2="6" y2="13.5" stroke="currentColor" stroke-width="1.3" />
				</svg>
				{#if activeMailbox}
					{@const channel = mailboxChannel(activeMailbox.kind)}
					<!-- The swatch yields on a very narrow phone so the folder name still fits. -->
					<span
						class="inline-block size-2.5 shrink-0 rounded-[3px] border max-[359px]:hidden"
						style:background-color={channel.fill}
						style:border-color={channel.stroke}
						aria-hidden="true"
					></span>
				{/if}
				<span class="min-w-0 truncate text-[15px] font-semibold">{activeMailbox?.name ?? 'Folder'}</span>
				{#if activeMailbox && activeMailbox.unread > 0}
					<!-- The count lives in the drawer too; on a very narrow phone the name wins. -->
					<span
						class="z-count !h-[18px] !min-w-[18px] !px-1 !text-[11px] max-[359px]:hidden"
						style:--z-stroke={COUNT_BADGE.border}
						style:--z-ink-on={COUNT_BADGE.text}
						style:background-color={COUNT_BADGE.bg}
					>
						{activeMailbox.unread}
					</span>
				{/if}
			</button>
		{:else}
			<span class="min-w-0 truncate px-2 text-[15px] font-semibold">{activeMailbox?.name ?? 'Folder'}</span>
		{/if}
			<AccountMenu class="!size-11 shrink-0 rounded-[10px] text-[13px]" />
		</div>

		<!--
			The icon cluster owns the right edge. Below 360px the select menu
			yields so the folder name still fits; a row checkbox starts a
			selection, and the menu comes back on the bulk bar.
		-->
		<div class="flex shrink-0 items-center gap-1">
		<div class="contents max-[359px]:hidden">
			{@render selectMenu()}
		</div>

		{#if !searchQuery}
			<Menu.Root positioning={{ placement: 'bottom-end', gutter: 6, overflowPadding: 12 }} lazyMount unmountOnExit>
				<Menu.Trigger
					class="btn-tactile h-11 min-w-11 shrink-0 px-2.5 text-[13px] font-semibold {filter === 'all'
						? ''
						: '!border-[var(--z-accent-line)] !text-[var(--z-accent-ink)]'}"
					aria-label="Filter, {filterLabel}"
				>
					{filterLabel}
				</Menu.Trigger>
				<Portal>
					<Menu.Positioner>
						<Menu.Content class="z-menu z-40 w-[168px]">
							<div class="z-menu-caption">Filter</div>
							{#each FILTERS as item (item.value)}
								<Menu.Item
									value={item.value}
									onSelect={() => onFilter(item.value)}
									class="z-menu-item min-h-11 justify-between"
								>
									{item.label}
									{#if filter === item.value}
										<svg class="size-3.5 text-[var(--z-accent)]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
											<path d="M3.5 8.5l3 3 6-7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
										</svg>
									{/if}
								</Menu.Item>
							{/each}
						</Menu.Content>
					</Menu.Positioner>
				</Portal>
			</Menu.Root>
		{/if}

		{#if onSearch}
			<button type="button" class="btn-tactile size-11 shrink-0 p-0" aria-label="Search mail" onclick={() => void focusSearch()}>
				<svg class="size-[18px] text-[var(--z-strong)]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
					<circle cx="7" cy="7" r="4.4" stroke="currentColor" stroke-width="1.6" />
					<path d="M10.4 10.4L14 14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
				</svg>
			</button>
		{/if}

		<button
			type="button"
			class="btn-tactile btn-primary size-11 shrink-0 p-0"
			aria-label="New message"
			onclick={(event) => onNewMessage(event.currentTarget.getBoundingClientRect())}
		>
			<svg class="size-[18px] text-white" viewBox="0 0 16 16" fill="none" aria-hidden="true">
				<path d="M8 3.5v9M3.5 8h9" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" />
			</svg>
		</button>
		</div>
	{/if}
</header>
