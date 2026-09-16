<script lang="ts">
	import { Menu } from '@ark-ui/svelte/menu';
	import { Portal } from '@ark-ui/svelte/portal';
	import type { MailboxDTO } from '#lib/mail/types';
	import type { RowGroup, ListRow } from '#lib/mail/rows';
	import type { BulkAction } from '../../../routes/mail.remote';
	import { formatListTime, initials } from '#lib/mail/rows';
	import { getHobdayTheme } from '#lib/mail/colors';
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
		onSetSelection: (ids: Set<string>) => void;
		onToggleSelect: (threadId: string) => void;
		onOpen: (threadId: string) => void;
		onBulk: (action: BulkAction, mailboxId?: string) => void;
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
	class="flex h-full min-h-0 flex-col overflow-hidden bg-white select-none {className}"
	aria-label="Message list"
>
	<!-- List Header with Hobday Tactile Controls -->
	<div class="flex h-[46px] shrink-0 items-center justify-between gap-3 border-b border-[#e2e8f0] px-4 max-md:px-3">
		<div class="flex items-center gap-2">
			<!-- Select Menu Trigger -->
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
					<svg class="size-3 text-slate-400" viewBox="0 0 16 16" fill="none" aria-hidden="true">
						<path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
				</Menu.Trigger>
				<Portal>
					<Menu.Positioner>
						<Menu.Content class="z-40 w-[184px] rounded-[8px] border border-[#cbd5e1] bg-white p-1.5 shadow-lg">
							<div class="px-2 pt-1 pb-1.5 font-mono text-[10px] tracking-wider text-slate-400 uppercase">
								Select
							</div>
							<Menu.Item value="all" onSelect={selectAll} class="cursor-pointer rounded-[6px] px-2.5 py-1.5 text-[13px] font-medium text-slate-700 data-highlighted:bg-slate-100">All</Menu.Item>
							<Menu.Item value="none" onSelect={selectNone} class="cursor-pointer rounded-[6px] px-2.5 py-1.5 text-[13px] font-medium text-slate-700 data-highlighted:bg-slate-100">None</Menu.Item>
							<Menu.Item value="unseen" onSelect={() => selectWhere((row) => row.unread)} class="cursor-pointer rounded-[6px] px-2.5 py-1.5 text-[13px] font-medium text-slate-700 data-highlighted:bg-slate-100">Unseen</Menu.Item>
							<Menu.Item value="seen" onSelect={() => selectWhere((row) => !row.unread)} class="cursor-pointer rounded-[6px] px-2.5 py-1.5 text-[13px] font-medium text-slate-700 data-highlighted:bg-slate-100">Seen</Menu.Item>
							<Menu.Item value="highlighted" onSelect={() => selectWhere((row) => row.starred)} class="cursor-pointer rounded-[6px] px-2.5 py-1.5 text-[13px] font-medium text-slate-700 data-highlighted:bg-slate-100">Highlighted</Menu.Item>
						</Menu.Content>
					</Menu.Positioner>
				</Portal>
			</Menu.Root>

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
		</div>

		<!-- Right: Count indicator & New message -->
		<div class="flex items-center gap-2">
			{#if flatRows.length > 0}
				<span class="text-xs font-medium text-slate-400 tabular-nums max-md:hidden">
					{flatRows.length} {flatRows.length === 1 ? 'message' : 'messages'}
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
		</div>
	</div>

	<!-- Bulk action bar: only while rows are selected -->
	{#if selection.size > 0}
		<div
			class="flex h-[42px] shrink-0 items-center gap-2 overflow-x-auto border-b border-[#cbd5e1] bg-blue-50/60 px-4 max-md:px-3 [&>*]:shrink-0"
			role="toolbar"
			aria-label="Selection actions"
		>
			<span class="text-[13px] font-semibold text-slate-800 tabular-nums">
				{selection.size} selected
			</span>

			<div class="h-4 w-px bg-blue-200"></div>

			<button
				type="button"
				class="btn-tactile !h-[26px] !px-2 !text-[12px]"
				disabled={busy}
				onclick={() => onBulk(allRead ? 'unread' : 'read')}
			>
				{allRead ? 'Mark unread' : 'Mark read'}
			</button>

			<button
				type="button"
				class="btn-tactile !h-[26px] !px-2 !text-[12px] max-md:order-1"
				disabled={busy}
				onclick={() => onBulk(allStarred ? 'unstar' : 'star')}
			>
				{allStarred ? 'Unhighlight' : 'Highlight'}
			</button>

			{#if moveTargets.length > 0}
				<Menu.Root positioning={{ placement: 'bottom-start', gutter: 6, overflowPadding: 12 }} lazyMount unmountOnExit>
					<Menu.Trigger class="btn-tactile !h-[26px] !px-2 !text-[12px] gap-1" disabled={busy}>
						Move to
						<svg class="size-3 text-slate-400" viewBox="0 0 16 16" fill="none" aria-hidden="true">
							<path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
						</svg>
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

			<button
				type="button"
				class="btn-tactile !h-[26px] !px-2 !text-[12px] !text-red-600 hover:!border-red-300 hover:!bg-red-50"
				disabled={busy}
				onclick={() => onBulk('delete')}
			>
				{mailbox?.kind === 'trash' ? 'Delete forever' : 'Delete'}
			</button>

			<button
				type="button"
				class="ml-auto btn-tactile !h-[26px] !px-2 !text-[12px] max-md:order-2"
				onclick={selectNone}
			>
				Clear
			</button>
		</div>
	{/if}

	<!-- Scrollable Messages List -->
	<div
		bind:this={listContainer}
		class="min-h-0 flex-1 overflow-y-auto px-4 py-3 [scroll-padding-top:8px] max-md:px-3 overscroll-contain"
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
			<div class="flex flex-col gap-2" aria-hidden="true">
				{#each Array.from({ length: 6 }) as _, index (index)}
					<div class="animate-pulse rounded-[8px] border border-[#e2e8f0] bg-white p-3.5">
						<div class="flex items-start gap-3">
							<div class="size-[34px] rounded-[6px] bg-slate-100"></div>
							<div class="flex-1 space-y-2">
								<div class="h-3.5 w-1/3 rounded bg-slate-100"></div>
								<div class="h-4 w-3/4 rounded bg-slate-100"></div>
								<div class="h-3 w-2/3 rounded bg-slate-100"></div>
							</div>
						</div>
					</div>
				{/each}
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
				<!-- Group Divider: Hobday-style clean horizontal lines with tabular counts -->
				<div class="mt-2 mb-2 flex items-center gap-2.5 first:mt-0" role="separator" aria-label={group.label}>
					<span class="font-mono text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
						{group.label}
					</span>
					<div class="h-px flex-1 bg-[#e2e8f0]"></div>
					<span class="text-xs font-semibold text-slate-400 tabular-nums">{group.rows.length}</span>
				</div>

				<div class="flex flex-col gap-2 pb-2">
					{#each group.rows as row (row.threadId)}
						{@const isCursor = row.threadId === cursorId}
						{@const isSelected = selection.has(row.threadId)}
						{@const theme = getHobdayTheme(row.from.email || row.senderLabel)}
						<div
							data-row-id={row.threadId}
							class="group/row relative grid cursor-pointer grid-cols-[34px_minmax(0,1fr)] items-start gap-3 rounded-[8px] border bg-white px-3.5 py-3 transition-all duration-[120ms] shadow-2xs {isSelected
								? 'border-blue-500 bg-blue-50/50 shadow-xs'
								: isCursor
									? 'border-blue-400 bg-blue-50/30'
									: row.unread
										? 'border-[#e2e8f0] bg-blue-50/30 hover:border-[#cbd5e1] hover:shadow-xs'
										: 'border-[#e2e8f0] hover:border-[#cbd5e1] hover:shadow-xs'}"
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
							<!-- Unread accent bar: the notification-card vocabulary, down the
							     card's left edge — scannable in a long list and untouched by
							     the selection border. The ringed status dot stays reserved for
							     tiny contexts (dock chips, compose step markers). -->
							{#if row.unread}
								<span
									class="absolute top-2.5 bottom-2.5 left-[7px] w-[3px] rounded-full bg-blue-600"
									aria-hidden="true"
								></span>
							{/if}

							<!-- Sender Avatar / Selection Box: Hobday Candy Accent Badge -->
							<button
								type="button"
								class="flex size-[34px] items-center justify-center rounded-[6px] text-xs font-bold transition-transform duration-[120ms] group-hover/row:scale-[1.03]"
								style:background-color={isSelected ? '#2563eb' : theme.bg}
								style:border="1px solid {isSelected ? '#1d4ed8' : theme.border}"
								style:color={isSelected ? '#ffffff' : theme.text}
								title="Click to toggle selection"
								onclick={(event) => {
									event.stopPropagation();
									onToggleSelect(row.threadId);
								}}
							>
								{#if isSelected}
									<svg class="size-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
										<path d="M3.5 8.5l3 3 6-7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
									</svg>
								{:else}
									{initials(row.senderLabel, row.from.email)}
								{/if}
							</button>

							<!-- Message Details -->
							<div class="min-w-0">
								<!-- Senders and Meta (Time, Star, Attachments) -->
								<div class="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-2">
									<div class="flex items-center gap-1.5 truncate">
										<span class="truncate text-[13px] font-semibold {row.unread ? 'text-slate-900' : 'text-slate-700'}">
											{row.senderLabel}
										</span>
									</div>

									<!-- Right aligned time & status icons (Hobday: tabular bold time) -->
									<div class="flex items-center gap-1.5 text-xs tabular-nums shrink-0 {row.unread ? 'font-bold text-slate-900' : 'font-medium text-slate-500'}">
										{#if row.starred}
											<svg class="size-3.5 text-amber-500" viewBox="0 0 16 16" fill="currentColor" aria-label="Highlighted">
												<path d="M8 1.5l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.2l-3.8 2.1.7-4.3-3.1-3 4.3-.6z" />
											</svg>
										{/if}
										{#if row.hasAttachment}
											<svg class="size-3.5 text-slate-400" viewBox="0 0 16 16" fill="none" aria-label="Has attachment">
												<path d="M10.5 4.5L6 9a1.8 1.8 0 002.5 2.5l4.5-4.5a3.2 3.2 0 00-4.5-4.5L3.7 7.3a4.6 4.6 0 006.5 6.5l3.3-3.3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
											</svg>
										{/if}
										<span>{formatListTime(row.receivedAt)}</span>
									</div>
								</div>

								<!-- Subject -->
								<div class="truncate text-[14px] leading-snug tracking-tight mt-0.5 {row.unread ? 'font-bold text-slate-900' : 'font-medium text-slate-800'}">
									{row.subject}
								</div>

								<!-- Preview -->
								{#if prefs.showPreview}
									<div class="truncate text-[12.5px] leading-relaxed text-slate-500 mt-0.5">
										{row.preview}
									</div>
								{/if}

							</div>
						</div>
					{/each}
				</div>
			{/each}
		{/if}
	</div>
</section>
