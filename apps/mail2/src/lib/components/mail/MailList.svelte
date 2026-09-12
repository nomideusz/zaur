<script lang="ts">
	import { Menu } from '@ark-ui/svelte/menu';
	import { Portal } from '@ark-ui/svelte/portal';
	import type { MailboxDTO } from '#lib/mail/types';
	import type { RowGroup, ListRow } from '#lib/mail/rows';
	import { formatListTime, initials } from '#lib/mail/rows';

	interface Props {
		mailbox: MailboxDTO | null;
		groups: RowGroup[] | undefined;
		loading: boolean;
		error: unknown;
		unseenOnly: boolean;
		cursorId: string | null;
		selection: Set<string>;
		syncedAt: string | null;
		onToggleUnseenOnly: (value: boolean) => void;
		onSetSelection: (ids: Set<string>) => void;
		onToggleSelect: (threadId: string) => void;
		onOpen: (threadId: string) => void;
		onRetry: () => void;
		onNewMessage: (anchor: { left: number; top: number; right: number; bottom: number }) => void;
	}

	let {
		mailbox,
		groups,
		loading,
		error,
		unseenOnly,
		cursorId,
		selection,
		syncedAt,
		onToggleUnseenOnly,
		onSetSelection,
		onToggleSelect,
		onOpen,
		onRetry,
		onNewMessage
	}: Props = $props();

	let listContainer = $state<HTMLDivElement | undefined>();

	const flatRows = $derived((groups ?? []).flatMap((group) => group.rows));

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

<section class="flex h-full min-h-0 flex-col overflow-hidden" aria-label="Message list">
	<div class="flex h-[50px] shrink-0 items-center gap-2.5 border-b border-divider px-[18px]">
		<Menu.Root positioning={{ placement: 'bottom-start', gutter: 6, overflowPadding: 12 }} lazyMount unmountOnExit>
			<Menu.Trigger
				class="inline-flex h-7 items-center gap-1.5 rounded-[7px] border border-line bg-container px-2 transition-colors duration-[160ms] hover:border-border-hover"
				aria-label="Selection options"
			>
				<span
					class="flex size-[15px] items-center justify-center rounded-[4px] border border-border-strong {selection.size >
					0
						? 'bg-accent'
						: 'bg-container'}"
					aria-hidden="true"
				>
					{#if selection.size > 0}
						<svg class="size-2.5 text-accent-fg" viewBox="0 0 16 16" fill="none">
							<path d="M3.5 8.5l3 3 6-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
						</svg>
					{/if}
				</span>
				<svg class="size-3 text-ink-secondary" viewBox="0 0 16 16" fill="none" aria-hidden="true">
					<path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
			</Menu.Trigger>
			<Portal>
				<Menu.Positioner>
					<Menu.Content class="z-40 w-[184px] rounded-[10px] border border-line bg-container p-1.5 shadow-menu">
						<div class="px-2 pt-1 pb-1.5 font-mono text-[10px] tracking-[0.08em] text-ink-tertiary uppercase">
							Select
						</div>
						<Menu.Item value="all" onSelect={selectAll} class="cursor-default rounded-[7px] px-2.5 py-2 text-[13px] data-highlighted:bg-divider">All</Menu.Item>
						<Menu.Item value="none" onSelect={selectNone} class="cursor-default rounded-[7px] px-2.5 py-2 text-[13px] data-highlighted:bg-divider">None</Menu.Item>
						<Menu.Item value="unseen" onSelect={() => selectWhere((row) => row.unread)} class="cursor-default rounded-[7px] px-2.5 py-2 text-[13px] data-highlighted:bg-divider">Unseen</Menu.Item>
						<Menu.Item value="seen" onSelect={() => selectWhere((row) => !row.unread)} class="cursor-default rounded-[7px] px-2.5 py-2 text-[13px] data-highlighted:bg-divider">Seen</Menu.Item>
						<Menu.Item value="highlighted" onSelect={() => selectWhere((row) => row.starred)} class="cursor-default rounded-[7px] px-2.5 py-2 text-[13px] data-highlighted:bg-divider">Highlighted</Menu.Item>
					</Menu.Content>
				</Menu.Positioner>
			</Portal>
		</Menu.Root>

		<div class="flex items-center rounded-full border border-line bg-container p-0.5" role="group" aria-label="Filter">
			<button
				type="button"
				class="h-6 rounded-full px-3 text-xs transition-colors duration-[160ms] {unseenOnly
					? 'text-ink-muted'
					: 'bg-accent-soft font-medium text-accent'}"
				aria-pressed={!unseenOnly}
				onclick={() => onToggleUnseenOnly(false)}
			>
				All
			</button>
			<button
				type="button"
				class="h-6 rounded-full px-3 text-xs transition-colors duration-[160ms] {unseenOnly
					? 'bg-accent-soft font-medium text-accent'
					: 'text-ink-muted'}"
				aria-pressed={unseenOnly}
				onclick={() => onToggleUnseenOnly(true)}
			>
				Unseen
			</button>
		</div>

		<button
			type="button"
			data-new-message
			class="ml-auto inline-flex h-8 items-center gap-[7px] rounded-[8px] bg-accent px-3.5 text-[13px] text-accent-fg transition-colors duration-[160ms] hover:brightness-110"
			onclick={(event) => {
				const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
				onNewMessage({ left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom });
			}}
		>
			<svg class="size-[15px]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
				<path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
			</svg>
			New message
		</button>
	</div>

	<div bind:this={listContainer} class="min-h-0 flex-1 overflow-y-auto px-[18px] py-4 [scroll-padding-top:8px]">
		{#if error}
			<div class="flex min-h-[320px] flex-col items-center justify-center gap-2 text-center">
				<p class="text-sm font-medium">Couldn't load messages</p>
				<p class="max-w-[320px] text-[13px] leading-relaxed text-ink-secondary">
					The mail server couldn't be reached. Check your connection and try again.
				</p>
				<button
					type="button"
					class="mt-1 h-8 rounded-[8px] border border-border bg-container px-3.5 text-[13px] transition-colors duration-[160ms] hover:border-border-hover"
					onclick={onRetry}
				>
					Retry
				</button>
			</div>
		{:else if loading && !groups}
			<div class="flex flex-col gap-[5px]" aria-hidden="true">
				{#each Array.from({ length: 6 }) as _, index (index)}
					<div class="animate-pulse rounded-[6px] border border-line-light bg-container p-3.5">
						<div class="flex items-start gap-3">
							<div class="size-[34px] rounded-[6px] bg-canvas"></div>
							<div class="flex-1 space-y-2">
								<div class="h-3 w-1/3 rounded bg-canvas"></div>
								<div class="h-3.5 w-3/4 rounded bg-canvas"></div>
								<div class="h-3 w-2/3 rounded bg-canvas"></div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{:else if groups && groups.length === 0}
			<div class="flex min-h-[320px] flex-col items-center justify-center gap-1 text-center">
				<p class="text-sm font-medium">{emptyCopy.title}</p>
				<p class="max-w-[320px] text-[13px] leading-relaxed text-ink-secondary">{emptyCopy.hint}</p>
			</div>
		{:else if groups}
			{#each groups as group (group.label)}
				<div class="mt-1 mb-2 flex items-center gap-2 first:mt-0" role="separator" aria-label={group.label}>
					<span class="font-mono text-[11px] tracking-[0.08em] text-ink-tertiary uppercase">{group.label}</span>
					<div class="h-px flex-1 bg-line"></div>
					<span class="text-xs text-ink-tertiary tabular-nums">{group.rows.length}</span>
				</div>
				<div class="flex flex-col gap-[5px] pb-1">
					{#each group.rows as row (row.threadId)}
						{@const isCursor = row.threadId === cursorId}
						{@const isSelected = selection.has(row.threadId)}
						<div
							data-row-id={row.threadId}
							class="grid cursor-default grid-cols-[34px_minmax(0,1fr)] items-start gap-3 rounded-[6px] border border-line-light bg-container px-3.5 py-2.5 transition-colors duration-[160ms] {isCursor
								? 'border-transparent bg-accent-tint'
								: 'hover:border-border-hover'}"
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
							<button
								type="button"
								class="flex size-[34px] items-center justify-center rounded-[6px] text-xs font-semibold transition-colors duration-[160ms] {isSelected
									? 'bg-accent text-accent-fg'
									: 'bg-accent-soft text-accent'}"
								title="Click to select"
								onclick={(event) => {
									event.stopPropagation();
									onToggleSelect(row.threadId);
								}}
							>
								{#if isSelected}
									<svg class="size-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
										<path d="M3.5 8.5l3 3 6-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
									</svg>
								{:else}
									{initials(row.senderLabel, row.from.email)}
								{/if}
							</button>
							<div class="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-2">
								<span class="truncate text-[13px] font-medium text-ink-muted">{row.senderLabel}</span>
								<span class="flex items-center gap-2 text-xs text-ink-secondary tabular-nums">
									{#if row.starred}
										<svg class="size-[15px] text-accent" viewBox="0 0 16 16" fill="currentColor" aria-label="Highlighted">
											<path d="M8 1.5l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.2l-3.8 2.1.7-4.3-3.1-3 4.3-.6z" />
										</svg>
									{/if}
									{#if row.hasAttachment}
										<svg class="size-[15px] text-ink-secondary" viewBox="0 0 16 16" fill="none" aria-label="Has attachment">
											<path d="M10.5 4.5L6 9a1.8 1.8 0 002.5 2.5l4.5-4.5a3.2 3.2 0 00-4.5-4.5L3.7 7.3a4.6 4.6 0 006.5 6.5l3.3-3.3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
										</svg>
									{/if}
									{formatListTime(row.receivedAt)}
								</span>
							</div>
							<div class="col-start-2 truncate text-[15px] leading-[1.35] tracking-[-0.01em] {row.unread ? 'font-semibold' : ''}">
								{row.subject}
							</div>
							<div class="col-start-2 truncate text-[13px] leading-[1.55] text-ink-secondary">
								{row.preview}
							</div>
						</div>
					{/each}
				</div>
			{/each}
			{#if syncedAt}
				<div class="pt-2 pb-1 text-center text-xs text-ink-tertiary" aria-hidden="true">
					·
				</div>
			{/if}
		{/if}
	</div>
</section>
