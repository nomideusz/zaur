<script lang="ts">
	import { Menu } from '@ark-ui/svelte/menu';
	import { Portal } from '@ark-ui/svelte/portal';
	import type { MailboxDTO } from '#lib/mail/types';
	import type { RowGroup, ListRow } from '#lib/mail/rows';
	import type { BulkAction, ListFilter } from '../../../routes/mail.remote';
	import { formatListTime, initials } from '#lib/mail/rows';
	import {
		CHANNELS,
		COUNT_BADGE,
		channelStyle,
		identityStyle,
		mailboxChannel,
		messageChannel
	} from '#lib/mail/colors';
	import { searchOperatorHint } from '@zaur/mail-core';
	import ActionIcon from './ActionIcon.svelte';
	import { prefs } from '#lib/settings.svelte.ts';
	import { viewport } from '#lib/viewport.svelte.ts';

	interface Props {
		/** The page hides this pane on a phone while the reader is open. */
		class?: string;
		mailbox: MailboxDTO | null;
		mailboxes: MailboxDTO[] | undefined;
		groups: RowGroup[] | undefined;
		loading: boolean;
		error: unknown;
		/** All | Unseen | Flagged — the header's segmented control. */
		filter: ListFilter;
		cursorId: string | null;
		/** The thread in the reader — the one row that has to be findable at a glance. */
		openThreadId?: string | null;
		selection: Set<string>;
		onFilter: (value: ListFilter) => void;
		/** Non-empty while the list is showing results rather than a folder. */
		searchQuery?: string;
		onClearSearch?: () => void;
		onSetSelection: (ids: Set<string>) => void;
		onToggleSelect: (threadId: string) => void;
		onOpen: (threadId: string) => void;
		/** Without `threadIds` the action runs on the selection; with them, on those rows. */
		onBulk: (action: BulkAction, mailboxId?: string, threadIds?: string[]) => void;
		busy?: boolean;
		onRetry: () => void;
		onNewMessage: (anchor: { left: number; top: number; right: number; bottom: number }) => void;
	}

	let {
		class: className = '',
		mailbox,
		mailboxes,
		groups,
		loading,
		error,
		filter,
		cursorId,
		openThreadId = null,
		selection,
		searchQuery = '',
		onClearSearch,
		onFilter,
		onSetSelection,
		onToggleSelect,
		onOpen,
		onBulk,
		busy = false,
		onRetry,
		onNewMessage
	}: Props = $props();

	let listContainer = $state<HTMLDivElement | undefined>();

	const flatRows = $derived((groups ?? []).flatMap((group) => group.rows));
	const selectedRows = $derived(flatRows.filter((row) => selection.has(row.threadId)));
	/** Toggles act on the majority state: all-read selection → "Mark unread". */
	const allRead = $derived(selectedRows.length > 0 && selectedRows.every((row) => !row.unread));
	const allStarred = $derived(selectedRows.length > 0 && selectedRows.every((row) => row.starred));
	const moveTargets = $derived(
		(mailboxes ?? []).filter((box) => box.id !== mailbox?.id && box.kind !== 'drafts')
	);
	/** Archive is the one move worth a button of its own on the row. */
	const archiveTarget = $derived(
		(mailboxes ?? []).find((box) => box.kind === 'archive' && box.id !== mailbox?.id)
	);
	const folderChannel = $derived(mailboxChannel(mailbox?.kind));

	$effect(() => {
		if (!cursorId || !listContainer) return;
		const element = listContainer.querySelector(`[data-row-id="${CSS.escape(cursorId)}"]`);
		element?.scrollIntoView({ block: 'nearest' });
	});

	function selectAll() {
		onSetSelection(new Set(flatRows.map((row) => row.threadId)));
	}

	function selectNone() {
		onSetSelection(new Set());
	}

	function selectWhere(predicate: (row: ListRow) => boolean) {
		onSetSelection(new Set(flatRows.filter(predicate).map((row) => row.threadId)));
	}

	/** Row buttons sit inside a row that opens on click — never let one through. */
	function rowAction(
		event: MouseEvent,
		threadId: string,
		action: BulkAction,
		mailboxId?: string
	) {
		event.stopPropagation();
		if (busy) return;
		onBulk(action, mailboxId, [threadId]);
	}

	/**
	 * A row's channel: the folder decides for junk, trash, sent and drafts, a
	 * flag outranks the server's "important", and the rest is correspondence.
	 * In search results a row's own mailbox is what counts, not the one the
	 * search ran from.
	 */
	function rowChannel(row: ListRow) {
		const kind = searchQuery
			? (mailboxes ?? []).find((box) => box.id === row.mailboxId)?.kind
			: mailbox?.kind;
		return messageChannel({ mailboxKind: kind, starred: row.starred, important: row.important });
	}

	const EMPTY_COPY: Record<string, { title: string; hint: string }> = {
		inbox: { title: 'Inbox zero', hint: 'Unseen messages appear here as soon as they arrive.' },
		drafts: { title: 'No drafts', hint: 'Composing a message saves a draft here automatically.' },
		sent: { title: 'Nothing sent yet', hint: 'Messages you send will show up here.' },
		archive: { title: 'Archive is empty', hint: 'Move messages here to keep the inbox quiet.' },
		junk: { title: 'No junk', hint: 'Messages marked as junk land here.' },
		trash: { title: 'Trash is empty', hint: 'Deleted messages stay here before final removal.' }
	};

	const emptyCopy = $derived(
		EMPTY_COPY[mailbox?.kind ?? ''] ?? {
			title: `Nothing in ${mailbox?.name ?? 'this folder'}`,
			hint: 'Messages will appear here as soon as they arrive.'
		}
	);
</script>

<section
	class="@container flex h-full min-h-0 flex-col overflow-hidden bg-[var(--z-surface)] select-none {className}"
	aria-label="Message list"
>
	<!--
		The header swaps its contents rather than growing a second bar: a list
		that jumps under you the moment you tick a box is the worst time to move
		it. With a selection up it wears the correspondence fill, so selection
		reads as one object with the rows it is about.
	-->
	<div class="shrink-0 border-b border-[var(--z-hairline)] {selection.size > 0 ? 'p-1.5' : ''}">
		<div
			class="flex h-[46px] items-center justify-between gap-3 {selection.size > 0
				? 'z-bulk rounded-[10px] border border-[var(--z-accent-stroke)] bg-[var(--z-accent-soft)] px-2.5'
				: 'px-3.5 max-md:px-3'}"
		>
			<div class="flex min-w-0 items-center gap-2">
				<!-- Select menu trigger — the one control both modes keep. -->
				<Menu.Root positioning={{ placement: 'bottom-start', gutter: 6, overflowPadding: 12 }} lazyMount unmountOnExit>
					<Menu.Trigger
						class="btn-tactile !h-7 gap-1.5 !px-2 {selection.size > 0 ? '!border-[var(--z-accent-line)]' : ''}"
						aria-label="Selection options"
					>
						<span
							class="flex size-[15px] items-center justify-center rounded-[4px] border-[1.5px] transition-colors {selection.size > 0
								? 'border-[var(--z-accent)] bg-[var(--z-accent)] text-white'
								: 'border-[var(--z-faint)] bg-[var(--z-surface)] text-transparent'}"
							aria-hidden="true"
						>
							<svg class="size-2.5" viewBox="0 0 16 16" fill="none">
								<path d="M3.5 8.5l3 3 6-7" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
							</svg>
						</span>
						<ActionIcon name="chevron" class="size-3 text-[var(--z-faint)]" />
					</Menu.Trigger>
					<Portal>
						<Menu.Positioner>
							<Menu.Content class="z-menu z-40 w-[184px]">
								<div class="z-menu-caption">Select</div>
								<Menu.Item value="all" onSelect={selectAll} class="z-menu-item">All</Menu.Item>
								<Menu.Item value="none" onSelect={selectNone} class="z-menu-item">None</Menu.Item>
								<Menu.Item value="unseen" onSelect={() => selectWhere((row) => row.unread)} class="z-menu-item">Unseen</Menu.Item>
								<Menu.Item value="seen" onSelect={() => selectWhere((row) => !row.unread)} class="z-menu-item">Seen</Menu.Item>
								<Menu.Item value="flagged" onSelect={() => selectWhere((row) => row.starred)} class="z-menu-item">Flagged</Menu.Item>
							</Menu.Content>
						</Menu.Positioner>
					</Portal>
				</Menu.Root>

				{#if selection.size > 0}
					<span class="shrink-0 text-[13px] font-semibold text-[var(--z-accent-ink)] tabular-nums">
						{selection.size}<span class="@max-[430px]:sr-only">&nbsp;selected</span>
					</span>
				{:else if searchQuery}
					<!--
						Unseen does not scope a search — the query does — so showing the
						filter here would be a control that lies. The query takes its place.
					-->
					<div class="z-field flex !h-7 min-w-0 items-center gap-1.5 !py-0 !pr-0.5 !pl-2">
						<svg class="size-3.5 shrink-0 text-[var(--z-faint)]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
							<circle cx="7" cy="7" r="4.4" stroke="currentColor" stroke-width="1.4" />
							<path d="M10.4 10.4L14 14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
						</svg>
						<span class="min-w-0 truncate text-xs font-semibold text-[var(--z-ink)]">{searchQuery}</span>
						{#if onClearSearch}
							<button type="button" class="z-icon-btn !size-6" aria-label="Clear search" title="Clear search (esc)" onclick={onClearSearch}>
								<svg class="size-3" viewBox="0 0 16 16" fill="none" aria-hidden="true">
									<path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
								</svg>
							</button>
						{/if}
					</div>
				{:else}
					<!-- Filter: All | Unseen | Flagged -->
					<div class="z-group" role="group" aria-label="Filter">
						<button type="button" class="z-segment !h-6 !px-2.5" aria-pressed={filter === 'all'} onclick={() => onFilter('all')}>
							All
						</button>
						<button type="button" class="z-segment !h-6 !px-2.5" aria-pressed={filter === 'unseen'} onclick={() => onFilter('unseen')}>
							Unseen
							{#if (mailbox?.unread ?? 0) > 0}
								<span
									class="z-count !h-4 !min-w-4 !px-1 !text-[9.5px]"
									style:--z-stroke={COUNT_BADGE.border}
									style:--z-ink-on={COUNT_BADGE.text}
									style:background-color={COUNT_BADGE.bg}
								>
									{mailbox?.unread}
								</span>
							{/if}
						</button>
						<button type="button" class="z-segment !h-6 !px-2.5 @max-[430px]:hidden" aria-pressed={filter === 'flagged'} onclick={() => onFilter('flagged')}>
							Flagged
						</button>
					</div>
				{/if}
			</div>

			<div class="flex shrink-0 items-center gap-2">
				{#if selection.size > 0}
					<!-- The same four actions a row offers on hover, in the same icons. -->
					<div class="z-group !border-[var(--z-accent-line)]" role="group" aria-label="Selection actions">
						<button
							type="button"
							class="z-icon-btn {allStarred ? '!text-[var(--z-ch-flagged-solid)] hover:!bg-[var(--z-ch-flagged-hover)]' : ''}"
							disabled={busy}
							aria-label={allStarred ? 'Remove flag' : 'Flag'}
							title={allStarred ? 'Remove flag (s)' : 'Flag (s)'}
							onclick={() => onBulk(allStarred ? 'unstar' : 'star')}
						>
							<ActionIcon name={allStarred ? 'star-filled' : 'star'} class="size-[15px]" />
						</button>
						<button
							type="button"
							class="z-icon-btn"
							disabled={busy}
							aria-label={allRead ? 'Mark unread' : 'Mark read'}
							title={allRead ? 'Mark unread' : 'Mark read'}
							onclick={() => onBulk(allRead ? 'unread' : 'read')}
						>
							<ActionIcon name={allRead ? 'mail' : 'mail-open'} class="size-[15px]" />
						</button>
						{#if archiveTarget}
							<button type="button" class="z-icon-btn" disabled={busy} aria-label="Archive" title="Archive (e)" onclick={() => onBulk('move', archiveTarget.id)}>
								<ActionIcon name="archive" class="size-[15px]" />
							</button>
						{/if}
						<button
							type="button"
							class="z-icon-btn hover:!bg-[var(--z-ch-discard-hover)] hover:!text-[var(--z-ch-discard-solid)] {mailbox?.kind === 'trash' ? '!text-[var(--z-ch-discard-solid)]' : ''}"
							disabled={busy}
							aria-label={mailbox?.kind === 'trash' ? 'Delete forever' : 'Delete'}
							title={mailbox?.kind === 'trash' ? 'Delete forever (#)' : 'Delete (#)'}
							onclick={() => onBulk('delete')}
						>
							<ActionIcon name="trash" class="size-[15px]" />
						</button>
					</div>

					{#if moveTargets.length > 0}
						<Menu.Root positioning={{ placement: 'bottom-end', gutter: 6, overflowPadding: 12 }} lazyMount unmountOnExit>
							<Menu.Trigger class="btn-tactile !h-7 shrink-0 gap-1 !border-[var(--z-accent-line)] !px-2.5 !text-[12px] !font-semibold !text-[var(--z-accent-ink)] @max-[430px]:hidden" disabled={busy}>
								Move to
								<ActionIcon name="chevron" class="size-[11px]" />
							</Menu.Trigger>
							<Portal>
								<Menu.Positioner>
									<Menu.Content class="z-menu z-40 max-h-[320px] w-56 overflow-y-auto">
										<div class="z-menu-caption">Move to</div>
										{#each moveTargets as target (target.id)}
											{@const channel = mailboxChannel(target.kind)}
											<Menu.Item value={target.id} onSelect={() => onBulk('move', target.id)} class="z-menu-item">
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
						class="btn-tactile !size-7 !border-[var(--z-accent-line)] !p-0 !text-[var(--z-accent-ink)]"
						onclick={selectNone}
						title="Clear selection (esc)"
						aria-label="Clear selection"
					>
						<svg class="size-3" viewBox="0 0 16 16" fill="none" aria-hidden="true">
							<path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
						</svg>
					</button>
				{:else}
					{#if flatRows.length > 0}
						<span class="z-mono text-[11px] text-[var(--z-soft)] @max-[430px]:hidden" title="{flatRows.length} {searchQuery ? 'results' : 'conversations'}">
							{flatRows.length}
						</span>
					{/if}
					<!-- A quiet 28px on a desk; on a phone it is the one primary control on screen, at 36px. -->
					<button
						type="button"
						data-new-message
						class="btn-tactile !p-0 {viewport.phone ? 'btn-primary !size-9' : '!size-7'}"
						onclick={(event) => onNewMessage(event.currentTarget.getBoundingClientRect())}
						title="New message (c)"
						aria-label="New message"
					>
						<svg class="{viewport.phone ? 'size-[17px] text-white' : 'size-[15px] text-[var(--z-body)]'}" viewBox="0 0 16 16" fill="none" aria-hidden="true">
							<path d="M8 3.5v9M3.5 8h9" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" />
						</svg>
					</button>
				{/if}
			</div>
		</div>
	</div>

	<!-- Scrollable list -->
	<div
		bind:this={listContainer}
		class="min-h-0 flex-1 overflow-y-auto px-3.5 pb-3 [scroll-padding-top:34px] max-md:px-3 overscroll-contain"
	>
		{#if error}
			<div
				class="z-railed mt-3 flex items-start gap-[9px] rounded-[10px] border border-[var(--z-ch-discard-stroke)] bg-[var(--z-ch-discard-fill)] py-[11px] pr-3 pl-[18px]"
				style:--z-rail="var(--z-ch-discard-solid)"
				style:--z-rail-inset="10px"
				role="alert"
			>
				<svg class="mt-px size-[15px] shrink-0 text-[var(--z-ch-discard-ink)]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
					<circle cx="8" cy="8" r="6.2" stroke="currentColor" stroke-width="1.4" />
					<path d="M8 5v3.6M8 10.7v.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
				</svg>
				<div class="min-w-0 flex-1">
					<span class="block text-[13px] font-semibold text-[var(--z-ch-discard-ink)]">Couldn't load messages</span>
					<span class="mt-0.5 block text-[12.5px] leading-normal text-[var(--z-ch-discard-ink)]">The mail server couldn't be reached.</span>
				</div>
				<button type="button" class="btn-tactile !h-7 shrink-0 !border-[var(--z-ch-discard-line)] !px-2.5 !text-[12px] !font-semibold !text-[var(--z-ch-discard-ink)]" onclick={onRetry}>Retry</button>
			</div>
		{:else if loading && !groups}
			<div class="flex flex-col gap-2 pt-3" aria-hidden="true">
				{#each [['34%', '72%', '58%'], ['28%', '64%', '48%'], ['40%', '80%', '52%'], ['30%', '68%', '44%'], ['36%', '76%', '60%']] as widths, index (index)}
					<div class="z-railed z-skeleton rounded-[10px] border border-[var(--z-hairline)] bg-[var(--z-surface)] py-[11px] pr-3 pl-[18px]" style:--z-rail="var(--z-hairline)">
						<div class="flex items-start gap-[11px]">
							<span class="size-[30px] shrink-0 rounded-[8px] bg-[var(--z-sunken)]"></span>
							<div class="flex flex-1 flex-col gap-[7px]">
								<span class="block h-[11px] rounded-[4px] bg-[var(--z-sunken)]" style:width={widths[0]}></span>
								<span class="block h-[11px] rounded-[4px] bg-[var(--z-sunken)]" style:width={widths[1]}></span>
								<span class="block h-[11px] rounded-[4px] bg-[var(--z-sunken)]" style:width={widths[2]}></span>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{:else if groups && groups.length === 0 && searchQuery}
			<!-- No results is a different empty than an empty folder, and the useful
			     thing to offer is what the query language can do. -->
			<div class="mt-3 flex flex-col items-center gap-1 rounded-[10px] border border-[var(--z-hairline)] bg-[var(--z-surface)] px-4 py-[18px] text-center">
				<span class="z-tile mb-1.5" style={channelStyle(CHANNELS.digest)}>
					<svg class="size-5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
						<circle cx="7" cy="7" r="4.4" stroke="currentColor" stroke-width="1.4" />
						<path d="M10.4 10.4L14 14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
					</svg>
				</span>
				<p class="text-[14px] font-bold text-[var(--z-ink)]">No matches</p>
				<p class="max-w-[300px] text-[12.5px] leading-relaxed text-[var(--z-muted)]">
					Nothing in {mailbox?.name ?? 'this folder'} matches
					<span class="font-medium text-[var(--z-strong)]">{searchQuery}</span>.
				</p>
				<p class="z-mono mt-2 max-w-[320px] text-[10.5px] leading-relaxed text-[var(--z-soft)]">{searchOperatorHint()}</p>
				{#if onClearSearch}
					<button type="button" class="btn-tactile mt-3 !h-8" onclick={onClearSearch}>Clear search</button>
				{/if}
			</div>
		{:else if groups && groups.length === 0}
			<div class="mt-3 flex flex-col items-center gap-1 rounded-[10px] border border-[var(--z-hairline)] bg-[var(--z-surface)] px-4 py-[18px] text-center">
				<span class="z-tile mb-1.5" style={channelStyle(mailbox?.kind === 'junk' || mailbox?.kind === 'trash' ? CHANNELS.discard : CHANNELS.confirmed)}>
					<svg class="size-5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
						<path d="M2.5 4h11a1 1 0 011 1v7a1 1 0 01-1 1h-11a1 1 0 01-1-1V5a1 1 0 011-1z" stroke="currentColor" stroke-width="1.3" />
						<path d="M2.5 5.5l5.5 4 5.5-4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
					</svg>
				</span>
				<p class="text-[14px] font-bold text-[var(--z-ink)]">{emptyCopy.title}</p>
				<p class="max-w-[260px] text-[12.5px] leading-relaxed text-[var(--z-muted)]">{emptyCopy.hint}</p>
				<button type="button" class="btn-tactile mt-3 !h-8" onclick={(event) => onNewMessage(event.currentTarget.getBoundingClientRect())}>
					<svg class="size-3.5 text-[var(--z-strong)]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
						<path d="M8 3.5v9M3.5 8h9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
					</svg>
					New message
				</button>
			</div>
		{:else if groups}
			{#each groups as group (group.label)}
				<!-- Group divider: stays put while its own rows scroll under it. -->
				<div
					class="sticky top-0 z-[5] -mx-3.5 flex items-center gap-2.5 bg-[color-mix(in_oklab,var(--z-surface)_95%,transparent)] px-3.5 pt-3 pb-2 backdrop-blur max-md:-mx-3 max-md:px-3"
					role="separator"
					aria-label={group.label}
				>
					<span class="z-caption">{group.label}</span>
					<span class="h-px flex-1 bg-[var(--z-hairline)]"></span>
					<span class="z-mono text-[11px] font-semibold text-[var(--z-soft)]">{group.rows.length}</span>
				</div>

				<div class="flex flex-col gap-2 pb-2">
					{#each group.rows as row (row.threadId)}
						{@const isCursor = row.threadId === cursorId}
						{@const isOpen = row.threadId === openThreadId}
						{@const isSelected = selection.has(row.threadId)}
						{@const channel = rowChannel(row)}
						<!--
							Four states, in rank: ticked and open both mean "you picked this" and
							wear the correspondence selection; the keyboard cursor is a whisper of
							the same blue; rest is the channel's own colour.
						-->
						<div
							data-row-id={row.threadId}
							data-state={isSelected ? 'selected' : isOpen ? 'open' : isCursor ? 'cursor' : 'rest'}
							data-unread={row.unread ? 'true' : 'false'}
							class="z-row z-railed group/row grid cursor-pointer grid-cols-[18px_30px_minmax(0,1fr)] items-start gap-x-[11px] rounded-[10px] border py-[11px] pr-3 pl-[18px] max-md:grid-cols-[30px_minmax(0,1fr)]"
							class:z-hue-wash={row.unread && !isSelected && !isOpen && !isCursor}
							aria-current={isOpen ? 'true' : undefined}
							style={channelStyle(channel)}
							onclick={() => onOpen(row.threadId)}
							onkeydown={(event) => {
								if (event.key === 'Enter' || event.key === ' ') {
									event.preventDefault();
									onOpen(row.threadId);
								}
							}}
							role="button"
							tabindex="-1"
							aria-pressed={isSelected}
						>
							<!-- Selection checkbox -->
							<button
								type="button"
								class="hobday-checkbox !size-[18px] self-center max-md:hidden"
								data-checked={isSelected}
								aria-label={isSelected ? 'Deselect thread' : 'Select thread'}
								aria-pressed={isSelected}
								title={isSelected ? 'Deselect thread' : 'Select thread'}
								onclick={(event) => {
									event.stopPropagation();
									onToggleSelect(row.threadId);
								}}
							>
								<svg class="size-3" viewBox="0 0 16 16" fill="none" aria-hidden="true">
									<path d="M3.5 8.5l3 3 6-7" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
								</svg>
							</button>

							<!-- The person: their identity tile, the same tone everywhere they appear. -->
							<span class="z-avatar self-center" style={identityStyle(row.senderEmail || row.senderLabel)} aria-hidden="true">
								{initials(row.senderLabel, row.senderEmail)}
							</span>

							<div class="min-w-0">
								<div class="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-2">
									<div class="flex min-w-0 items-baseline gap-[7px]">
										<span class="truncate text-[13px] {row.unread ? 'font-bold text-[var(--z-ink)]' : 'font-medium text-[var(--z-muted)]'}">
											{row.senderLabel}
										</span>
										<!-- The channel says what kind of thing this is; the folder already says correspondence. -->
										{#if channel.key !== 'correspondence' || row.unread}
											<span class="z-chip @max-[430px]:hidden">{channel.label}</span>
										{/if}
										{#if row.messageCount > 1}
											<span class="z-chip z-chip-filled !tracking-normal !normal-case" title="{row.messageCount} messages in this conversation">
												{row.messageCount}
											</span>
										{/if}
									</div>

									<!-- Indicators only — the buttons that act on them are in the
									     hover strip, which takes over exactly this slot. -->
									<div class="z-row-meta flex shrink-0 items-center gap-1.5">
										{#if row.hasAttachment}
											<ActionIcon name="clip" class="size-3.5 shrink-0 text-[var(--z-faint)]" label="Has attachment" />
										{/if}
										<time
											class="z-mono text-[11px] {row.unread ? 'font-semibold text-[var(--z-strong)]' : 'font-medium text-[var(--z-soft)]'}"
											datetime={row.receivedAt}
										>
											{formatListTime(row.receivedAt)}
										</time>
									</div>
								</div>

								<div class="mt-[3px] truncate text-[14px] leading-snug tracking-[-0.01em] {row.unread ? 'font-semibold text-[var(--z-ink)]' : 'font-normal text-[var(--z-strong)]'}">
									{row.subject}
								</div>

								{#if prefs.showPreview}
									<div class="mt-0.5 truncate text-[12.5px] leading-[1.6] text-[var(--z-muted)]">
										{row.preview}
									</div>
								{/if}
							</div>

							<!--
								Hover actions: one card, quiet items. Pointer-only, and out of
								the tab order — 50 rows × 4 stops is not a tab order. The
								keyboard has s / e / # on the cursor row, and every one of
								these is in the selection header too.
							-->
							<div class="z-row-actions z-group absolute top-[5px] right-[7px] !p-[3px] !shadow-[var(--z-shadow-menu)]">
								<button
									type="button"
									tabindex="-1"
									class="z-icon-btn {row.starred ? '!text-[var(--z-ch-flagged-solid)] hover:!bg-[var(--z-ch-flagged-hover)]' : ''}"
									aria-label={row.starred ? 'Remove flag' : 'Flag'}
									aria-pressed={row.starred}
									title={row.starred ? 'Remove flag (s)' : 'Flag (s)'}
									onclick={(event) => rowAction(event, row.threadId, row.starred ? 'unstar' : 'star')}
								>
									<ActionIcon name={row.starred ? 'star-filled' : 'star'} class="size-[15px]" />
								</button>
								<button
									type="button"
									tabindex="-1"
									class="z-icon-btn"
									aria-label={row.unread ? 'Mark read' : 'Mark unread'}
									title={row.unread ? 'Mark read' : 'Mark unread'}
									onclick={(event) => rowAction(event, row.threadId, row.unread ? 'read' : 'unread')}
								>
									<ActionIcon name={row.unread ? 'mail-open' : 'mail'} class="size-[15px]" />
								</button>
								{#if archiveTarget}
									<button type="button" tabindex="-1" class="z-icon-btn" aria-label="Archive" title="Archive (e)" onclick={(event) => rowAction(event, row.threadId, 'move', archiveTarget.id)}>
										<ActionIcon name="archive" class="size-[15px]" />
									</button>
								{/if}
								<button
									type="button"
									tabindex="-1"
									class="z-icon-btn hover:!bg-[var(--z-ch-discard-hover)] hover:!text-[var(--z-ch-discard-solid)]"
									aria-label={mailbox?.kind === 'trash' ? 'Delete forever' : 'Delete'}
									title={mailbox?.kind === 'trash' ? 'Delete forever (#)' : 'Delete (#)'}
									onclick={(event) => rowAction(event, row.threadId, 'delete')}
								>
									<ActionIcon name="trash" class="size-[15px]" />
								</button>
							</div>
						</div>
					{/each}
				</div>
			{/each}
		{/if}
	</div>
</section>

<style>
	/*
	 * A row is a card wearing its channel: the rail is the channel's solid, and
	 * unread adds the channel's fill and stroke. Read rows go white with the
	 * rail at a third strength; selection is the correspondence solid whatever
	 * the channel, because "you picked this" is one idea across the shell.
	 */
	.z-row {
		transition:
			background-color 120ms ease,
			border-color 120ms ease,
			box-shadow 120ms ease;
	}

	/*
	 * Scoped styles are unlayered and `.z-hue-wash` lives in `@layer base`, so a
	 * plain `.z-row { background: #fff }` here would silently beat the shared
	 * wash and flatten every unread row. Claim the default only when the wash is
	 * not on the element; the state rules below still outrank both.
	 */
	.z-row:not(.z-hue-wash) {
		background: var(--z-surface);
		border-color: var(--z-hairline);
	}

	.z-row[data-unread='false'] {
		--z-rail-strength: 0.34;
	}

	.z-row[data-unread='true'] {
		box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
	}

	.z-row[data-state='cursor'] {
		background: var(--z-accent-faint);
		border-color: var(--z-accent-line);
	}

	.z-row[data-state='selected'],
	.z-row[data-state='open'] {
		background: var(--z-accent-tint);
		border-color: var(--z-accent);
		box-shadow: 0 0 0 1px var(--z-accent);
	}

	.z-row-actions {
		opacity: 0;
		pointer-events: none;
		transition: opacity 120ms ease;
	}

	.z-row-meta {
		transition: opacity 120ms ease;
	}

	@media (prefers-reduced-motion: no-preference) {
		.z-bulk {
			animation: z-bulk-in 140ms ease-out;
		}
	}

	@keyframes z-bulk-in {
		from {
			opacity: 0;
			transform: translateY(-3px);
		}
	}

	@media (hover: hover) {
		.z-row[data-state='rest']:not(.z-hue-wash):hover {
			border-color: var(--z-line);
			box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
		}

		/* One slot, two states: the time steps out, the buttons step in. */
		.z-row:hover .z-row-actions {
			opacity: 1;
			pointer-events: auto;
		}

		.z-row:hover .z-row-meta {
			opacity: 0;
		}
	}

	@media (hover: none) {
		.z-row-actions {
			display: none;
		}
	}
</style>
