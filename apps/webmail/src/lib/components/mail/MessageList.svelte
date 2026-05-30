<script lang="ts">
	import { browser } from '$app/environment';
	import AlertCircle from '$lib/components/icons/AlertCircle.svelte';
	import LoaderCircle from '$lib/components/icons/LoaderCircle.svelte';
	import Inbox from '$lib/components/icons/Inbox.svelte';
	import RefreshCw from '$lib/components/icons/RefreshCw.svelte';
	import Search from '$lib/components/icons/Search.svelte';
	import { frameSvg } from '@zaur/sprite';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/Button.svelte';
	import LoadingIndicator from '$lib/components/ui/LoadingIndicator.svelte';
	import MessageListItem from './MessageListItem.svelte';
	import MessageListHeader from './MessageListHeader.svelte';
	import MessageListMobileBar from './MessageListMobileBar.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { supportsMobileListGestures } from '$lib/utils/pointer-env';
	import { mail } from '$lib/stores/mail.svelte';
	import { isTraditionalMailView, usesSectionedMessageList } from '$lib/mail/view-mode';
	import { settings } from '$lib/stores/settings.svelte';
	import { getCachedMessagePreviews } from '$lib/db/recent-threads';
	import type { MessagePreview } from '$lib/types/mail';
	import { cn } from '$lib/utils/cn';

	interface Props {
		messages: MessagePreview[];
		mailboxName: string;
		mailboxRouteId?: string;
		loading?: boolean;
		loadingMore?: boolean;
		hasMore?: boolean;
		error?: string | null;
		total?: number;
		emptyMessage?: string;
		emptyHint?: string;
		emptyIcon?: 'inbox' | 'search' | 'none';
		emptyActionHref?: string;
		emptyActionLabel?: string;
		hideOnMobile?: boolean;
		expanded?: boolean;
		onLoadMore?: () => void;
		onRetry?: () => void;
		onBulkAction?: () => void;
	}

	let {
		messages,
		mailboxName,
		mailboxRouteId,
		loading = false,
		loadingMore = false,
		hasMore = false,
		error = null,
		total,
		emptyMessage,
		emptyHint,
		emptyIcon = 'inbox',
		emptyActionHref,
		emptyActionLabel,
		hideOnMobile = false,
		expanded = false,
		onLoadMore,
		onRetry,
		onBulkAction
	}: Props = $props();

	let loadSentinel = $state<HTMLDivElement | null>(null);
	let sectionMessagesByFolder = $state<Record<string, MessagePreview[]>>({});
let sectionVisibleCounts = $state<Record<string, number>>({});
let sectionHasMoreByFolder = $state<Record<string, boolean>>({});
const SECTION_PAGE_SIZE = 8;
const NEW_MESSAGE_WINDOW_MS = 1000 * 60 * 60 * 24;
const NEW_MESSAGE_SEEN_RETENTION_MS = 1000 * 60 * 60 * 24 * 45;
const NEW_MESSAGE_SEEN_MAX_ENTRIES = 5000;
const NEW_MESSAGE_SEEN_STORAGE_PREFIX = 'zaur:new-message-first-seen:';
const READ_EVER_STORAGE_PREFIX = 'zaur:message-read-ever:';
let firstSeenByMessageId = $state<Record<string, number>>({});
let firstSeenStorageKey = $state<string | null>(null);
let readEverByMessageId = $state<Record<string, number>>({});
let readEverStorageKey = $state<string | null>(null);

	const activeThreadId = $derived($page.params.threadId);
	const searchReturnTo = $derived.by(() => {
		if ($page.url.pathname !== '/mail/search') return null;
		return `${$page.url.pathname}${$page.url.search}`;
	});
	const activeMessageId = $derived.by(() => {
		const urlMessageId = $page.url.searchParams.get('messageId');
		if (urlMessageId) return urlMessageId;

		if (!activeThreadId) return null;
		return (
			messages.find((message) => message.threadId === activeThreadId)?.id ??
			mail.messages.find((message) => message.threadId === activeThreadId)?.id ??
			null
		);
	});
	const selectedIds = $derived([...mail.selectedMessageIds]);
	$effect(() => {
		if (!settings.showBulkSelect && mail.hasSelection) {
			mail.clearSelection();
		}
	});

	$effect(() => {
		settings.autoLoadMore;
		hasMore;
		loadingMore;
		const sentinel = loadSentinel;
		const load = onLoadMore;
		if (!settings.autoLoadMore || !hasMore || !load || !sentinel) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting && !loadingMore) load();
			},
			{ rootMargin: '240px' }
		);
		observer.observe(sentinel);
		return () => observer.disconnect();
	});

	const defaultEmptyMessage = $derived.by(() => {
		switch (mailboxRouteId) {
			case 'inbox':
				return 'Inbox zero';
			case 'drafts':
				return 'No drafts yet';
			case 'sent':
				return 'Nothing sent yet';
			case 'trash':
				return 'Trash is clear';
			case 'archive':
				return 'Archive is clear';
			case 'junk':
				return 'No junk mail';
			default:
				return 'Nothing here yet';
		}
	});

	const defaultEmptyHint = $derived.by(() => {
		switch (mailboxRouteId) {
			case 'inbox':
				return 'New messages will appear here as soon as they arrive.';
			case 'drafts':
				return 'Start a message and it will be saved here automatically.';
			case 'sent':
				return 'Messages you send will be collected here for easy reference.';
			case 'trash':
				return 'Deleted messages will stay here until you empty them.';
			default:
				return null;
		}
	});

	function messageHref(message: MessagePreview): string {
		const href = `/mail/${message.mailboxId}/${message.threadId}`;
		const searchParams = new URLSearchParams();
		searchParams.set('messageId', message.id);
		if (searchReturnTo) {
			searchParams.set('returnTo', searchReturnTo);
		}
		return `${href}?${searchParams.toString()}`;
	}

	const traditionalView = $derived(isTraditionalMailView(settings.mailViewMode));
	const listExpanded = $derived(!traditionalView && expanded);
	const sectionMode = $derived(
		!!mailboxRouteId && usesSectionedMessageList(settings.mailViewMode)
	);
	const bulkSelectEnabled = $derived(!!mailboxRouteId && settings.showBulkSelect);
	const showListHeader = $derived(!sectionMode && bulkSelectEnabled);
	const showMobileSelectionBar = $derived(
		!!mailboxRouteId && mail.hasSelection && supportsMobileListGestures()
	);
	const sectionRoleOrder = new Map([
		['inbox', 0],
		['new', 1],
		['unread', 1],
		['read', 2],
		['sent', 1],
		['drafts', 2]
	]);
	function friendlyFolderSectionTitle(role: string | undefined, name: string): string {
		if (role === 'sent') return 'Recently sent';
		if (role === 'drafts') return 'Drafts to finish';
		if (role === 'archive') return 'Saved for later';
		if (role === 'junk') return 'Spam and junk';
		if (role === 'trash') return 'Recently deleted';
		return name;
	}
	function firstSeenTimestamp(message: MessagePreview): number {
		const tracked = firstSeenByMessageId[message.id];
		if (typeof tracked === 'number' && Number.isFinite(tracked)) return tracked;
		const received = new Date(message.receivedAt).getTime();
		if (!Number.isNaN(received)) return received;
		return Date.now();
	}
	function isNewUnreadMessage(message: MessagePreview): boolean {
		if (!message.unread) return false;
		if (readEverByMessageId[message.id] !== undefined) return false;
		const age = Date.now() - firstSeenTimestamp(message);
		return age >= 0 && age <= NEW_MESSAGE_WINDOW_MS;
	}
	const newUnreadMessages = $derived.by(() =>
		messages.filter((message) => isNewUnreadMessage(message))
	);
	const olderUnreadMessages = $derived.by(() =>
		messages.filter((message) => message.unread && !isNewUnreadMessage(message))
	);

	$effect(() => {
		if (!browser) return;
		const accountId = auth.client?.getAccountId() ?? 'local';
		const key = `${NEW_MESSAGE_SEEN_STORAGE_PREFIX}${accountId}`;
		if (firstSeenStorageKey === key) return;

		firstSeenStorageKey = key;
		try {
			const raw = localStorage.getItem(key);
			firstSeenByMessageId = raw ? (JSON.parse(raw) as Record<string, number>) : {};
		} catch {
			firstSeenByMessageId = {};
		}
	});

	$effect(() => {
		if (!browser) return;
		const accountId = auth.client?.getAccountId() ?? 'local';
		const key = `${READ_EVER_STORAGE_PREFIX}${accountId}`;
		if (readEverStorageKey === key) return;

		readEverStorageKey = key;
		try {
			const raw = localStorage.getItem(key);
			readEverByMessageId = raw ? (JSON.parse(raw) as Record<string, number>) : {};
		} catch {
			readEverByMessageId = {};
		}
	});

	$effect(() => {
		if (!browser || !firstSeenStorageKey) return;

		const now = Date.now();
		const currentIds = new Set(messages.map((message) => message.id));
		const next: Record<string, number> = { ...firstSeenByMessageId };
		let changed = false;

		for (const message of messages) {
			if (next[message.id] === undefined) {
				next[message.id] = now;
				changed = true;
			}
		}

		for (const [id, seenAt] of Object.entries(next)) {
			if (!currentIds.has(id) && now - seenAt > NEW_MESSAGE_SEEN_RETENTION_MS) {
				delete next[id];
				changed = true;
			}
		}

		const entries = Object.entries(next);
		if (entries.length > NEW_MESSAGE_SEEN_MAX_ENTRIES) {
			entries
				.sort((a, b) => a[1] - b[1])
				.slice(0, entries.length - NEW_MESSAGE_SEEN_MAX_ENTRIES)
				.forEach(([id]) => {
					delete next[id];
					changed = true;
				});
		}

		if (!changed) return;
		firstSeenByMessageId = next;
		try {
			localStorage.setItem(firstSeenStorageKey, JSON.stringify(next));
		} catch {
			// Ignore storage quota/private mode errors; feature gracefully degrades.
		}
	});

	$effect(() => {
		if (!browser || !readEverStorageKey) return;

		const now = Date.now();
		const currentIds = new Set(messages.map((message) => message.id));
		const next: Record<string, number> = { ...readEverByMessageId };
		let changed = false;

		for (const message of messages) {
			if (!message.unread && next[message.id] === undefined) {
				next[message.id] = now;
				changed = true;
			}
		}

		for (const [id, seenAt] of Object.entries(next)) {
			if (!currentIds.has(id) && now - seenAt > NEW_MESSAGE_SEEN_RETENTION_MS) {
				delete next[id];
				changed = true;
			}
		}

		const entries = Object.entries(next);
		if (entries.length > NEW_MESSAGE_SEEN_MAX_ENTRIES) {
			entries
				.sort((a, b) => a[1] - b[1])
				.slice(0, entries.length - NEW_MESSAGE_SEEN_MAX_ENTRIES)
				.forEach(([id]) => {
					delete next[id];
					changed = true;
				});
		}

		if (!changed) return;
		readEverByMessageId = next;
		try {
			localStorage.setItem(readEverStorageKey, JSON.stringify(next));
		} catch {
			// Ignore storage quota/private mode errors; feature gracefully degrades.
		}
	});
	const orderedFolders = $derived.by(() =>
		mail.mailboxes
			.filter(
				(folder) =>
					folder.id !== 'unread' &&
					folder.id !== 'read' &&
					(!mailboxRouteId || folder.id !== mailboxRouteId)
			)
			.sort((a, b) => {
				const aRank = sectionRoleOrder.get(a.role ?? '') ?? 99;
				const bRank = sectionRoleOrder.get(b.role ?? '') ?? 99;
				return aRank - bRank || a.name.localeCompare(b.name);
			})
	);
	const folderSections = $derived.by(() =>
		[
			...(newUnreadMessages.length > 0
				? [
						{
							id: 'new',
							name: 'New',
							routeId: mailboxRouteId ?? 'inbox',
							messages: newUnreadMessages.slice(0, sectionVisibleCounts.new ?? SECTION_PAGE_SIZE),
							totalCount: newUnreadMessages.length
						}
					]
				: []),
			...(olderUnreadMessages.length > 0
				? [
						{
							id: 'unread',
							name: 'Unread (older)',
							routeId: mailboxRouteId ?? 'inbox',
							messages: olderUnreadMessages.slice(0, sectionVisibleCounts.unread ?? SECTION_PAGE_SIZE),
							totalCount: olderUnreadMessages.length
						}
					]
				: []),
			...(newUnreadMessages.length === 0 && olderUnreadMessages.length === 0
				? [
						{
							id: 'unread-empty',
							name: 'Unread',
							routeId: mailboxRouteId ?? 'inbox',
							messages: [] as MessagePreview[],
							totalCount: 0
						}
					]
				: []),
			{
				id: 'read',
				name: mailboxRouteId === 'inbox' ? 'Earlier in Inbox' : 'Previously read',
				routeId: mailboxRouteId ?? 'inbox',
				messages: messages
					.filter((message) => !message.unread)
					.slice(0, sectionVisibleCounts.read ?? SECTION_PAGE_SIZE),
				totalCount: messages.filter((message) => !message.unread).length
			},
			...orderedFolders
				.filter((folder) => {
					const knownCount = sectionMessagesByFolder[folder.id]?.length ?? 0;
					return knownCount > 0 || !!sectionHasMoreByFolder[folder.id];
				})
				.map((folder) => ({
					id: folder.id,
					name: friendlyFolderSectionTitle(folder.role, folder.name),
					routeId: folder.id,
					messages: (sectionMessagesByFolder[folder.id] ?? []).slice(
						0,
						sectionVisibleCounts[folder.id] ?? SECTION_PAGE_SIZE
					),
					totalCount: sectionMessagesByFolder[folder.id]?.length ?? 0
				}))
		]
	);

	$effect(() => {
		sectionMode;
		mailboxRouteId;
		sectionMessagesByFolder = {};
		sectionHasMoreByFolder = {};
		sectionVisibleCounts = { new: SECTION_PAGE_SIZE, unread: SECTION_PAGE_SIZE, read: SECTION_PAGE_SIZE };
	});

	$effect(() => {
		const client = auth.client;
		const routeId = mailboxRouteId;
		const folders = orderedFolders;
		const useSectionMode = sectionMode;
		messages;

		if (!useSectionMode || !client || !routeId || folders.length === 0) {
			sectionMessagesByFolder = {};
			return;
		}

		let cancelled = false;
		const accountId = client.getAccountId();

		void Promise.all(
			folders.map(async (folder) => {
				const requested = sectionVisibleCounts[folder.id] ?? SECTION_PAGE_SIZE;
				if (folder.id === routeId) return [folder.id, messages.slice(0, requested), messages.length > requested] as const;
				const cached = await getCachedMessagePreviews(accountId, folder.id, requested);
				return [folder.id, cached, cached.length >= requested] as const;
			})
		).then((entries) => {
			if (cancelled) return;
			sectionMessagesByFolder = Object.fromEntries(entries.map(([id, cached]) => [id, cached]));
			sectionHasMoreByFolder = Object.fromEntries(entries.map(([id, _, hasMore]) => [id, hasMore]));
		});

		return () => {
			cancelled = true;
		};
	});

	function sectionMessageHref(message: MessagePreview, folderId: string): string {
		const params = new URLSearchParams();
		params.set('messageId', message.id);
		return `/mail/${folderId}/${message.threadId}?${params.toString()}`;
	}

	function sectionEmptyText(sectionId: string): string {
		if (sectionId === 'new') return 'No new mail.';
		if (sectionId === 'unread') return 'No older unread messages right now.';
		if (sectionId === 'unread-empty') return 'No unread messages right now.';
		if (sectionId === 'read') return 'No previously read messages yet.';
		return 'No messages yet.';
	}

	function sectionCanShowMore(sectionId: string): boolean {
		const visible = sectionVisibleCounts[sectionId] ?? SECTION_PAGE_SIZE;
		if (sectionId === 'new') return newUnreadMessages.length > visible;
		if (sectionId === 'unread') return olderUnreadMessages.length > visible;
		if (sectionId === 'unread-empty') return false;
		if (sectionId === 'read') return messages.filter((message) => !message.unread).length > visible;
		const known = sectionMessagesByFolder[sectionId]?.length ?? 0;
		return known > visible || !!sectionHasMoreByFolder[sectionId];
	}

	function revealMoreInSection(sectionId: string) {
		sectionVisibleCounts = {
			...sectionVisibleCounts,
			[sectionId]: (sectionVisibleCounts[sectionId] ?? SECTION_PAGE_SIZE) + SECTION_PAGE_SIZE
		};
	}
</script>

<section
	class={cn(
		'z-mail-pane-surface flex min-h-0 min-w-0 flex-col',
		'overflow-hidden',
		listExpanded
			? 'flex-1 md:mx-auto md:w-full md:max-w-2xl'
			: 'w-full md:w-(--width-list) md:max-w-(--width-list) md:flex-none',
		hideOnMobile ? (mail.hasSelection ? 'flex' : 'hidden md:flex') : 'flex',
		!settings.hidePaneBorders && !listExpanded && 'border-r border-border',
		showMobileSelectionBar && 'z-mail-list--selecting',
		traditionalView && 'z-mail-list--traditional'
	)}
	style="view-transition-name: message-list;"
	aria-label="{mailboxName} messages"
>
	{#if sectionMode && mailboxRouteId && !showMobileSelectionBar}
		<div class="z-mail-text-nav">
			<h1 class="z-mail-text-nav__title">ZAUR Mail</h1>
			<div class="z-mail-text-nav__links">
				<a
					class={cn('z-mail-text-nav__link', mailboxRouteId === 'inbox' && 'z-mail-text-nav__link--active')}
					href="/mail/inbox"
					aria-current={mailboxRouteId === 'inbox' ? 'page' : undefined}
				>
					Inbox
				</a>
				<a class="z-mail-text-nav__link" href="/settings/mail">Settings</a>
			</div>
		</div>
	{/if}

	{#if showListHeader}
		<div class="relative z-10 shrink-0">
			<MessageListHeader
				{mailboxRouteId}
				{onBulkAction}
				disabled={!!mailboxRouteId && (loading || !!error || !messages.length)}
			/>
		</div>
	{/if}
	<div
		class={cn('z-pane-scroll min-h-0 flex-1 overflow-y-auto', showMobileSelectionBar && 'z-mail-list-scroll--with-bar')}
	>
		{#if loading}
			<LoadingIndicator label="Loading messages…" />
		{:else if error}
			<div
				class={cn(
					'flex flex-col items-center text-center',
					settings.compactListErrorState ? 'gap-2 px-4 py-8' : 'gap-3 px-5 py-12'
				)}
			>
				<div class={cn('text-danger', settings.compactListErrorState ? 'p-1' : 'p-2')}>
					<AlertCircle class={cn(settings.compactListErrorState ? 'size-8' : 'size-10')} aria-hidden="true" />
				</div>
				<div>
					<p class="text-sm font-semibold text-fg">Messages could not load</p>
					<p class="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-fg-muted">{error}</p>
				</div>
				{#if onRetry && !settings.hideListErrorRetry}
					<Button variant="ghost" class="text-sm" onclick={onRetry}>
						<RefreshCw class="size-4" aria-hidden="true" />
						Try again
					</Button>
				{/if}
			</div>
		{:else if !sectionMode && messages.length === 0}
			<div
				class={cn(
					'flex flex-col items-center text-center',
					settings.compactListEmptyState ? 'gap-3 px-4 py-10' : 'gap-4 px-6 py-16'
				)}
			>
				{#if emptyIcon !== 'none' && !settings.hideListEmptyHints}
					<div class="text-fg-subtle">
						{#if emptyIcon === 'search'}
							{@html frameSvg('sad', { color: 'currentColor', scale: 2 })}
						{:else}
							{@html frameSvg('sleep', { color: 'currentColor', scale: 2 })}
						{/if}
					</div>
				{/if}
				<div>
					<p class="text-sm font-semibold text-fg">
						{emptyMessage ?? defaultEmptyMessage}
					</p>
					{#if !settings.hideListEmptyHints}
						{#if emptyHint}
							<p class="mx-auto mt-1 max-w-xs text-xs text-fg-muted">{emptyHint}</p>
						{:else if !emptyMessage && defaultEmptyHint}
							<p class="mx-auto mt-1 max-w-xs text-xs text-fg-muted">{defaultEmptyHint}</p>
						{/if}
					{/if}
				</div>
				{#if !settings.hideListEmptyActions}
					{#if emptyActionHref && emptyActionLabel}
						<Button href={emptyActionHref} variant="ghost" class="text-sm">{emptyActionLabel}</Button>
					{:else if mailboxRouteId === 'inbox' || mailboxRouteId === 'drafts'}
						<Button href="/mail/compose" variant="ghost" class="text-sm">New message</Button>
					{/if}
				{/if}
			</div>
		{:else}
			{#if sectionMode}
				<div class="z-mail-folder-sections">
					{#each folderSections as section (section.id)}
						<section class="z-mail-folder-section">
							{#if section.messages.length === 0}
								<p class="z-mail-folder-section__empty">{sectionEmptyText(section.id)}</p>
							{:else}
								<div class="z-mail-folder-section__head">
									<h2 class="z-mail-folder-section__title">{section.name}</h2>
									<span class="z-mail-folder-section__count">{section.totalCount}</span>
								</div>
								<ul class="z-mail-folder-section__list">
									{#each section.messages as message, index (message.id)}
										<li>
											<a
												href={sectionMessageHref(message, section.routeId)}
												class="z-mail-folder-section__message"
												aria-current={activeMessageId === message.id ? 'page' : undefined}
											>
												<span
													class={cn(
														'z-mail-folder-section__subject',
														activeMessageId === message.id && 'z-mail-folder-section__subject--active',
														settings.highlightUnreadInList && message.unread && 'font-semibold'
													)}
												>
													{message.subject.trim() || '(no subject)'}
												</span>
												<span class="z-mail-folder-section__number">
													{index + 1}
												</span>
											</a>
										</li>
									{/each}
								</ul>
								{#if sectionCanShowMore(section.id)}
									<div class="z-mail-folder-section__footer">
										<button
											type="button"
											class="z-mail-folder-section__more"
											onclick={() => revealMoreInSection(section.id)}
										>
											Show more
										</button>
									</div>
								{/if}
							{/if}
						</section>
					{/each}
				</div>
			{:else}
				{#each messages as message (message.id)}
					<MessageListItem
						{message}
						href={messageHref(message)}
						active={activeMessageId === message.id}
						bulkSelectEnabled={bulkSelectEnabled}
						selected={mailboxRouteId ? selectedIds.includes(message.id) : false}
						{mailboxRouteId}
						enableMobileGestures={bulkSelectEnabled}
						onSelect={
							mailboxRouteId
								? (modifiers) =>
										mail.selectMessageAt(message.id, { ...modifiers, activeMessageId })
								: undefined
						}
					/>
				{/each}
			{/if}

			{#if !sectionMode && hasMore && onLoadMore}
				<div
					class={cn(
						'px-4',
						settings.compactLoadMore ? 'py-1.5' : 'py-3',
						!settings.hideListRowDividers && 'border-t border-border'
					)}
					bind:this={loadSentinel}
				>
					{#if settings.autoLoadMore}
						<div
							class={cn(
								'flex items-center justify-center text-xs text-fg-subtle',
								settings.compactLoadMore ? 'py-1' : 'py-2'
							)}
							aria-live="polite"
						>
							{#if loadingMore}
								<span class="z-spinner size-4" aria-hidden="true">
									<LoaderCircle class="size-full" />
								</span>
								<span class="ml-2">Loading…</span>
							{/if}
						</div>
					{:else}
						<Button variant="ghost" class="w-full" disabled={loadingMore} onclick={onLoadMore}>
							{#if loadingMore}
								<span class="z-spinner size-4" aria-hidden="true">
									<LoaderCircle class="size-full" />
								</span>
								Loading…
							{:else}
								Load more
							{/if}
						</Button>
					{/if}
				</div>
			{/if}
		{/if}
	</div>

	{#if showMobileSelectionBar && mailboxRouteId}
		<MessageListMobileBar {mailboxRouteId} {onBulkAction} />
	{/if}
</section>
