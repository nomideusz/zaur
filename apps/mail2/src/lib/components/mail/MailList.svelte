<script lang="ts">
	import { Menu } from '@ark-ui/svelte/menu';
	import { Portal } from '@ark-ui/svelte/portal';
	import type { MailboxDTO } from '#lib/mail/types';
	import type { RowGroup, ListRow } from '#lib/mail/rows';
	import type { BulkAction } from '../../../routes/mail.remote';
	import { formatListTime } from '#lib/mail/rows';
	import { getHobdayTheme } from '#lib/mail/colors';
	import { searchOperatorHint } from '@zaur/mail-core';
	import ActionIcon from './ActionIcon.svelte';
	import { prefs } from '#lib/settings.svelte.ts';

	interface Props {
		/** The page hides this pane on a phone while the reader is open. */
		class?: string;
		mailbox: MailboxDTO | null;
		mailboxes: MailboxDTO[] | undefined;
		groups: RowGroup[] | undefined;
		loading: boolean;
		error: unknown;
		unseenOnly: boolean;
		cursorId: string | null;
		selection: Set<string>;
		onToggleUnseenOnly: (value: boolean) => void;
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
		unseenOnly,
		cursorId,
		selection,
		searchQuery = '',
		onClearSearch,
		onToggleUnseenOnly,
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

	const EMPTY_COPY: Record<string, { title: string; hint: string }> = {
		inbox: { title: 'Inbox zero', hint: 'Unseen messages will appear here as soon as they arrive.' },
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
	class="@container flex h-full min-h-0 flex-col overflow-hidden bg-white select-none {className}"
	aria-label="Message list"
>
	<!-- List Header with Hobday Tactile Controls -->
	<div class="flex h-[46px] shrink-0 items-center justify-between gap-3 border-b border-[#e2e8f0] px-4 max-md:px-3">
		<div class="flex min-w-0 items-center gap-2">
			<!-- Select Menu Trigger — the one control both modes keep. -->
			<Menu.Root positioning={{ placement: 'bottom-start', gutter: 6, overflowPadding: 12 }} lazyMount unmountOnExit>
				<Menu.Trigger
					class="btn-tactile !h-[28px] !px-2 gap-1.5"
					aria-label="Selection options"
				>
					<span
						class="flex size-3.5 items-center justify-center rounded-[3px] border transition-colors {selection.size > 0
							? 'border-transparent bg-blue-600 text-white'
							: 'border-[#94a3b8] bg-white text-transparent'}"
						aria-hidden="true"
					>
						<svg class="size-2.5" viewBox="0 0 16 16" fill="none">
							<path
								d="M3.5 8.5l3 3 6-7"
								stroke="currentColor"
								stroke-width="2.4"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					</span>
					<ActionIcon name="chevron" class="size-3 text-slate-400" />
				</Menu.Trigger>
				<Portal>
					<Menu.Positioner>
						<Menu.Content class="z-40 w-[184px] rounded-[8px] border border-[#cbd5e1] bg-white p-1.5 shadow-lg">
							<div class="z-caption px-2 pt-1 pb-1.5">Select</div>
							<Menu.Item value="all" onSelect={selectAll} class="cursor-pointer rounded-[6px] px-2.5 py-1.5 text-[13px] font-medium text-slate-700 data-highlighted:bg-slate-100">All</Menu.Item>
							<Menu.Item value="none" onSelect={selectNone} class="cursor-pointer rounded-[6px] px-2.5 py-1.5 text-[13px] font-medium text-slate-700 data-highlighted:bg-slate-100">None</Menu.Item>
							<Menu.Item value="unseen" onSelect={() => selectWhere((row) => row.unread)} class="cursor-pointer rounded-[6px] px-2.5 py-1.5 text-[13px] font-medium text-slate-700 data-highlighted:bg-slate-100">Unseen</Menu.Item>
							<Menu.Item value="seen" onSelect={() => selectWhere((row) => !row.unread)} class="cursor-pointer rounded-[6px] px-2.5 py-1.5 text-[13px] font-medium text-slate-700 data-highlighted:bg-slate-100">Seen</Menu.Item>
							<Menu.Item value="highlighted" onSelect={() => selectWhere((row) => row.starred)} class="cursor-pointer rounded-[6px] px-2.5 py-1.5 text-[13px] font-medium text-slate-700 data-highlighted:bg-slate-100">Highlighted</Menu.Item>
						</Menu.Content>
					</Menu.Positioner>
				</Portal>
			</Menu.Root>

			{#if selection.size > 0}
				<span class="z-bulk shrink-0 text-[13px] font-semibold text-slate-800 tabular-nums">
					{selection.size}<span class="@max-[430px]:sr-only">&nbsp;selected</span>
				</span>

				<!--
					The same four actions a row offers on hover, in the same icons,
					built like the All/Unseen control so the header keeps its shapes.
				-->
				<div
					class="z-bulk flex shrink-0 items-center rounded-[6px] border border-[#cbd5e1] bg-white p-0.5 shadow-2xs"
					role="group"
					aria-label="Selection actions"
				>
					<button
						type="button"
						class="flex size-[24px] items-center justify-center rounded-[4px] transition-colors disabled:opacity-40 {allStarred
							? 'text-amber-500 hover:bg-amber-50'
							: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}"
						disabled={busy}
						aria-label={allStarred ? 'Unhighlight' : 'Highlight'}
						title={allStarred ? 'Unhighlight (s)' : 'Highlight (s)'}
						onclick={() => onBulk(allStarred ? 'unstar' : 'star')}
					>
						<ActionIcon name={allStarred ? 'star-filled' : 'star'} />
					</button>

					<button
						type="button"
						class="flex size-[24px] items-center justify-center rounded-[4px] text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
						disabled={busy}
						aria-label={allRead ? 'Mark unread' : 'Mark read'}
						title={allRead ? 'Mark unread' : 'Mark read'}
						onclick={() => onBulk(allRead ? 'unread' : 'read')}
					>
						<ActionIcon name={allRead ? 'mail' : 'mail-open'} />
					</button>

					{#if archiveTarget}
						<button
							type="button"
							class="flex size-[24px] items-center justify-center rounded-[4px] text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
							disabled={busy}
							aria-label="Archive"
							title="Archive (e)"
							onclick={() => onBulk('move', archiveTarget.id)}
						>
							<ActionIcon name="archive" />
						</button>
					{/if}

					<button
						type="button"
						class="flex size-[24px] items-center justify-center rounded-[4px] transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40 {mailbox?.kind ===
						'trash'
							? 'text-red-600'
							: 'text-slate-600'}"
						disabled={busy}
						aria-label={mailbox?.kind === 'trash' ? 'Delete forever' : 'Delete'}
						title={mailbox?.kind === 'trash' ? 'Delete forever (#)' : 'Delete (#)'}
						onclick={() => onBulk('delete')}
					>
						<ActionIcon name="trash" />
					</button>
				</div>

				{#if moveTargets.length > 0}
					<Menu.Root positioning={{ placement: 'bottom-start', gutter: 6, overflowPadding: 12 }} lazyMount unmountOnExit>
						<Menu.Trigger class="z-bulk btn-tactile !h-[28px] !px-2 !text-[12px] gap-1 shrink-0" disabled={busy}>
							Move to
							<ActionIcon name="chevron" class="size-3 text-slate-400" />
						</Menu.Trigger>
						<Portal>
							<Menu.Positioner>
								<Menu.Content class="z-40 max-h-[320px] w-56 overflow-y-auto rounded-[8px] border border-[#cbd5e1] bg-white p-1.5 shadow-lg">
									{#each moveTargets as target (target.id)}
										<Menu.Item
											value={target.id}
											onSelect={() => onBulk('move', target.id)}
											class="cursor-pointer truncate rounded-[6px] px-2.5 py-1.5 text-[13px] font-medium text-slate-700 data-highlighted:bg-slate-100"
										>
											{target.name}
										</Menu.Item>
									{/each}
								</Menu.Content>
							</Menu.Positioner>
						</Portal>
					</Menu.Root>
				{/if}
			{:else if searchQuery}
				<!--
					Unseen does not scope a search — the query does — so showing the
					filter here would be a control that lies. The query takes its place.
				-->
				<div
					class="flex min-w-0 items-center gap-1.5 rounded-[6px] border border-[#cbd5e1] bg-white py-0.5 pr-0.5 pl-2 shadow-2xs"
				>
					<svg class="size-3.5 shrink-0 text-slate-400" viewBox="0 0 16 16" fill="none" aria-hidden="true">
						<circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.5" />
						<path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
					</svg>
					<span class="min-w-0 truncate text-xs font-semibold text-slate-900">{searchQuery}</span>
					{#if onClearSearch}
						<button
							type="button"
							class="flex size-6 shrink-0 items-center justify-center rounded-[4px] text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
							aria-label="Clear search"
							title="Clear search (esc)"
							onclick={onClearSearch}
						>
							<svg class="size-3" viewBox="0 0 16 16" fill="none" aria-hidden="true">
								<path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
							</svg>
						</button>
					{/if}
				</div>
			{:else}
				<!-- Filter segmented control: All | Unseen -->
				<div class="flex items-center rounded-[6px] border border-[#cbd5e1] bg-white p-0.5 shadow-2xs" role="group" aria-label="Filter">
					<button
						type="button"
						class="h-[24px] rounded-[4px] px-2.5 text-xs font-semibold transition-all {unseenOnly
							? 'text-slate-600 hover:text-slate-900'
							: 'bg-slate-100 text-slate-900 shadow-xs'}"
						aria-pressed={!unseenOnly}
						onclick={() => onToggleUnseenOnly(false)}
					>
						All
					</button>
					<button
						type="button"
						class="flex h-[24px] items-center gap-1.5 rounded-[4px] px-2.5 text-xs font-semibold transition-all {unseenOnly
							? 'bg-slate-100 text-slate-900 shadow-xs'
							: 'text-slate-600 hover:text-slate-900'}"
						aria-pressed={unseenOnly}
						onclick={() => onToggleUnseenOnly(true)}
					>
						Unseen
						{#if (mailbox?.unread ?? 0) > 0}
							<span
								class="flex h-4 min-w-[16px] items-center justify-center rounded-[3px] bg-blue-100 px-1 text-[10px] font-semibold text-blue-700 tabular-nums"
							>
								{mailbox?.unread}
							</span>
						{/if}
					</button>
				</div>
			{/if}
		</div>

		<!-- Right: Count indicator & New message, or the way out of a selection -->
		<div class="flex shrink-0 items-center gap-2">
			{#if selection.size > 0}
				<button
					type="button"
					class="z-bulk btn-tactile !size-7 !p-0"
					onclick={selectNone}
					title="Clear selection (esc)"
					aria-label="Clear selection"
				>
					<svg class="size-3.5 text-slate-600" viewBox="0 0 16 16" fill="none" aria-hidden="true">
						<path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
					</svg>
				</button>
			{:else}
				{#if flatRows.length > 0}
					<!-- Rows are threads, and one of them now says how many messages it holds. -->
					<span class="text-xs font-medium text-slate-400 tabular-nums @max-[430px]:hidden">
						{flatRows.length}
						{#if searchQuery}
							{flatRows.length === 1 ? 'result' : 'results'}
						{:else}
							{flatRows.length === 1 ? 'conversation' : 'conversations'}
						{/if}
					</span>
				{/if}
				<button
					type="button"
					data-new-message
					class="btn-tactile !size-7 !p-0 max-md:!size-9"
					onclick={(event) => onNewMessage(event.currentTarget.getBoundingClientRect())}
					title="New message (c)"
					aria-label="New message"
				>
					<svg class="size-4 text-slate-800" viewBox="0 0 16 16" fill="none" aria-hidden="true">
						<path d="M8 3.5v9M3.5 8h9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
					</svg>
				</button>
			{/if}
		</div>
	</div>

	<!-- Scrollable Messages List -->
	<div
		bind:this={listContainer}
		class="min-h-0 flex-1 overflow-y-auto px-4 pb-3 [scroll-padding-top:34px] max-md:px-3 overscroll-contain"
	>
		{#if error}
			<div class="flex min-h-[320px] flex-col items-center justify-center gap-2 text-center">
				<p class="text-sm font-semibold text-slate-800">Couldn't load messages</p>
				<p class="max-w-[320px] text-[13px] leading-relaxed text-slate-500">
					The mail server couldn't be reached. Check your connection and try again.
				</p>
				<button
					type="button"
					class="btn-tactile mt-2"
					onclick={onRetry}
				>
					Retry
				</button>
			</div>
		{:else if loading && !groups}
			<div class="flex flex-col gap-2 pt-3" aria-hidden="true">
				{#each Array.from({ length: 6 }) as _, index (index)}
					<div class="relative animate-pulse rounded-[10px] border border-[#e2e8f0] bg-white py-3 pr-3 pl-[18px]">
						<span class="absolute top-3 bottom-3 left-[7px] w-[3px] rounded-full bg-slate-200"></span>
						<div class="flex items-start gap-3">
							<div class="size-[18px] rounded-[5px] bg-slate-100"></div>
							<div class="flex-1 space-y-2">
								<div class="h-3.5 w-1/3 rounded bg-slate-100"></div>
								<div class="h-4 w-3/4 rounded bg-slate-100"></div>
								<div class="h-3 w-2/3 rounded bg-slate-100"></div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{:else if groups && groups.length === 0 && searchQuery}
			<!-- No results is a different empty than an empty folder, and the useful
			     thing to offer is what the query language can do. -->
			<div class="flex min-h-[320px] flex-col items-center justify-center gap-1 px-4 text-center">
				<div class="mb-2 flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
					<svg class="size-5" viewBox="0 0 16 16" fill="none">
						<circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.4" />
						<path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
					</svg>
				</div>
				<p class="text-sm font-semibold text-slate-800">No matches</p>
				<p class="max-w-[340px] text-[13px] leading-relaxed text-slate-500">
					Nothing in {mailbox?.name ?? 'this folder'} matches
					<span class="font-medium text-slate-700">{searchQuery}</span>.
				</p>
				<p class="z-caption mt-3 max-w-[340px] leading-relaxed normal-case">
					{searchOperatorHint()}
				</p>
				{#if onClearSearch}
					<button type="button" class="btn-tactile mt-3" onclick={onClearSearch}>
						Clear search
					</button>
				{/if}
			</div>
		{:else if groups && groups.length === 0}
			<div class="flex min-h-[320px] flex-col items-center justify-center gap-1 text-center">
				<div class="flex size-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 mb-2">
					<svg class="size-5" viewBox="0 0 16 16" fill="none">
						<path d="M2.5 4h11a1 1 0 011 1v7a1 1 0 01-1 1h-11a1 1 0 01-1-1V5a1 1 0 011-1z" stroke="currentColor" stroke-width="1.3" />
						<path d="M2.5 5.5l5.5 4 5.5-4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
					</svg>
				</div>
				<p class="text-sm font-semibold text-slate-800">{emptyCopy.title}</p>
				<p class="max-w-[320px] text-[13px] leading-relaxed text-slate-500">{emptyCopy.hint}</p>
				<button
					type="button"
					class="btn-tactile mt-3"
					onclick={(event) => onNewMessage(event.currentTarget.getBoundingClientRect())}
				>
					<svg class="size-4 text-slate-700" viewBox="0 0 16 16" fill="none" aria-hidden="true">
						<path d="M8 3.5v9M3.5 8h9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
					</svg>
					New message
				</button>
			</div>
		{:else if groups}
			{#each groups as group (group.label)}
				<!-- Group divider: stays put while its own rows scroll under it. -->
				<div
					class="sticky top-0 z-[5] -mx-4 mb-2 flex items-center gap-2.5 bg-white px-4 pt-3 pb-2 max-md:-mx-3 max-md:px-3"
					role="separator"
					aria-label={group.label}
				>
					<span class="z-caption">{group.label}</span>
					<div class="h-px flex-1 bg-[#e2e8f0]"></div>
					<span class="text-xs font-semibold text-slate-400 tabular-nums">{group.rows.length}</span>
				</div>

				<div class="flex flex-col gap-2 pb-2">
					{#each group.rows as row (row.threadId)}
						{@const isCursor = row.threadId === cursorId}
						{@const isSelected = selection.has(row.threadId)}
						{@const theme = getHobdayTheme(row.senderEmail || row.senderLabel)}
						<div
							data-row-id={row.threadId}
							data-state={isSelected ? 'selected' : isCursor ? 'cursor' : 'rest'}
							data-unread={row.unread ? 'true' : 'false'}
							class="z-row z-railed group/row grid cursor-pointer grid-cols-[18px_minmax(0,1fr)] items-start gap-x-3 rounded-[10px] border py-3 pr-3 pl-[18px]"
							class:z-hue-wash={row.unread}
							style:--z-rail={theme.border}
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
							<!-- Selection checkbox: a quiet Hobday box so the row stays a pure text card. -->
							<button
								type="button"
								class="flex size-[18px] items-center justify-center self-center rounded-[5px] border-[1.5px] transition-colors {isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-[#94a3b8] bg-white text-transparent hover:border-slate-500'}"
								aria-label={isSelected ? 'Deselect thread' : 'Select thread'}
								aria-pressed={isSelected}
								title={isSelected ? 'Deselect thread' : 'Select thread'}
								onclick={(event) => {
									event.stopPropagation();
									onToggleSelect(row.threadId);
								}}
							>
								<svg class="size-3" viewBox="0 0 16 16" fill="none" aria-hidden="true">
									<path d="M3.5 8.5l3 3 6-7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
								</svg>
							</button>

							<!-- Message Details -->
							<div class="min-w-0">
								<!-- Sender + thread size, then the meta cluster on the right -->
								<div class="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-2">
									<div class="flex min-w-0 items-baseline gap-1.5">
										<span class="truncate text-[13px] {row.unread ? 'font-semibold text-slate-900' : 'font-medium text-slate-600'}">
											{row.senderLabel}
										</span>
										{#if row.messageCount > 1}
											<span
												class="shrink-0 rounded-[4px] border px-1 font-mono text-[10px] leading-[15px] font-semibold tabular-nums"
												style:background-color={theme.badgeBg}
												style:border-color={theme.badgeBorder}
												style:color={theme.badgeText}
												title="{row.messageCount} messages in this conversation"
											>
												{row.messageCount}
											</span>
										{/if}
									</div>

									<!--
										Indicators only — the buttons that act on them are in the
										hover strip, which takes over exactly this slot. Both would
										be read out twice, so the state lives on the strip's buttons.
									-->
									<div class="z-row-meta flex shrink-0 items-center gap-1.5">
										{#if row.starred}
											<svg class="size-3.5 shrink-0 text-amber-500" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
												<path d="M8 1.5l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.2l-3.8 2.1.7-4.3-3.1-3 4.3-.6z" />
											</svg>
										{/if}
										{#if row.hasAttachment}
											<ActionIcon
												name="clip"
												class="size-3.5 shrink-0 text-slate-400"
												label="Has attachment"
											/>
										{/if}
										<time
											class="text-[11.5px] tabular-nums {row.unread
												? 'font-semibold text-slate-700'
												: 'font-medium text-slate-400'}"
											datetime={row.receivedAt}
										>
											{formatListTime(row.receivedAt)}
										</time>
									</div>
								</div>

								<!-- Subject -->
								<div class="mt-0.5 truncate text-[14px] leading-snug tracking-tight {row.unread ? 'font-semibold text-slate-900' : 'font-normal text-slate-700'}">
									{row.subject}
								</div>

								<!-- Preview -->
								{#if prefs.showPreview}
									<div class="z-row-preview mt-0.5 truncate text-[12.5px] leading-relaxed text-slate-500">
										{row.preview}
									</div>
								{/if}
							</div>

							<!--
								Hover actions, in the language of an Ark menu: one card, quiet
								items. Pointer-only, and out of the tab order — 50 rows × 4 stops
								is not a tab order. The keyboard has s / e / # on the cursor row,
								and every one of these is in the bulk bar too.
							-->
							<div
								class="z-row-actions absolute top-1 right-[7px] flex items-center gap-0.5 rounded-[8px] border border-[#cbd5e1] bg-white p-1 shadow-lg"
							>
								<button
									type="button"
									tabindex="-1"
									class="flex size-[26px] items-center justify-center rounded-[6px] transition-colors {row.starred
										? 'text-amber-500 hover:bg-amber-50'
										: 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}"
									aria-label={row.starred ? 'Remove highlight' : 'Highlight'}
									aria-pressed={row.starred}
									title={row.starred ? 'Remove highlight (s)' : 'Highlight (s)'}
									onclick={(event) => rowAction(event, row.threadId, row.starred ? 'unstar' : 'star')}
								>
									<ActionIcon name={row.starred ? 'star-filled' : 'star'} />
								</button>

								<button
									type="button"
									tabindex="-1"
									class="flex size-[26px] items-center justify-center rounded-[6px] text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
									aria-label={row.unread ? 'Mark read' : 'Mark unread'}
									title={row.unread ? 'Mark read' : 'Mark unread'}
									onclick={(event) => rowAction(event, row.threadId, row.unread ? 'read' : 'unread')}
								>
									<ActionIcon name={row.unread ? 'mail-open' : 'mail'} />
								</button>

								{#if archiveTarget}
									<button
										type="button"
										tabindex="-1"
										class="flex size-[26px] items-center justify-center rounded-[6px] text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
										aria-label="Archive"
										title="Archive (e)"
										onclick={(event) => rowAction(event, row.threadId, 'move', archiveTarget.id)}
									>
										<ActionIcon name="archive" />
									</button>
								{/if}

								<button
									type="button"
									tabindex="-1"
									class="flex size-[26px] items-center justify-center rounded-[6px] text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
									aria-label={mailbox?.kind === 'trash' ? 'Delete forever' : 'Delete'}
									title={mailbox?.kind === 'trash' ? 'Delete forever (#)' : 'Delete (#)'}
									onclick={(event) => rowAction(event, row.threadId, 'delete')}
								>
									<ActionIcon name="trash" />
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
	 * A row is a card wearing `.z-railed` in its sender's hue. Two channels, no
	 * collision: the hue says who it is from, its weight says whether it has
	 * been seen. `.z-hue-wash` carries the unseen surface; everything here is
	 * the part that is this component's own — the state machine.
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
		background: #ffffff;
		border-color: #e2e8f0;
	}

	/* Seen: the rail keeps the hue, and steps back. */
	.z-row[data-unread='false'] {
		--z-rail-strength: 0.32;
	}

	.z-row[data-unread='true'] {
		box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
	}

	/* Selection stays blue everywhere, so it outranks the sender's own colour. */
	.z-row[data-state='cursor'] {
		background: #f5f9ff;
		border-color: #60a5fa;
	}

	.z-row[data-state='selected'] {
		background: #e3eeff;
		border-color: #3b82f6;
		box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
	}

	/*
	 * Hover affordances are pointer-only — on a touch screen :hover sticks,
	 * and the checkbox plus the bulk bar are the whole story there anyway.
	 */
	.z-row-actions {
		opacity: 0;
		pointer-events: none;
		transition: opacity 120ms ease;
	}

	.z-row-meta {
		transition: opacity 120ms ease;
	}

	/*
	 * The header swaps its contents rather than growing a second bar: a list
	 * that jumps under you the moment you tick a box is the worst time to move
	 * it. The bottom of this pane is taken anyway — toasts land there, and the
	 * compose dock on a phone.
	 */
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
		.z-row[data-state='rest']:hover {
			border-color: #cbd5e1;
			box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
		}

		.z-row[data-state='rest'][data-unread='true']:hover {
			border-color: color-mix(in oklab, var(--z-rail) 48%, #ffffff);
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
