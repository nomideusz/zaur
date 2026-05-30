<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import MessageListItem from '$lib/components/mail/MessageListItem.svelte';
	import MessageListLoadMore from '$lib/components/mail/MessageListLoadMore.svelte';
	import MessageListStatus from '$lib/components/mail/MessageListStatus.svelte';
	import type { MessageListProps } from '$lib/components/mail/message-list-props';
	import {
		activeMessageId,
		defaultEmptyHint,
		defaultEmptyMessage,
		messageHref
	} from '$lib/components/mail/message-list-utils';
	import { getCachedMessagePreviews } from '$lib/db/recent-threads';
	import { auth } from '$lib/stores/auth.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import type { MessagePreview } from '$lib/types/mail';
	import { cn } from '$lib/utils/cn';

	let {
		messages,
		mailboxName,
		mailboxRouteId,
		loading = false,
		loadingMore = false,
		hasMore = false,
		error = null,
		emptyMessage,
		emptyHint,
		emptyIcon = 'inbox',
		emptyActionHref,
		emptyActionLabel,
		hideOnMobile = false,
		onLoadMore,
		onRetry
	}: MessageListProps = $props();

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
	const currentMessageId = $derived(
		activeMessageId(
			messages,
			$page.url.searchParams.get('messageId'),
			activeThreadId
		)
	);
	const sectionMode = $derived(!!mailboxRouteId);
	const minimalChrome = $derived(!settings.showReaderListRail && !!activeThreadId);
	const resolvedEmptyMessage = $derived(emptyMessage ?? defaultEmptyMessage(mailboxRouteId));
	const resolvedEmptyHint = $derived(
		emptyHint ?? (emptyMessage ? null : defaultEmptyHint(mailboxRouteId))
	);
	const showFlatEmpty = $derived(!sectionMode && !loading && !error && messages.length === 0);

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
			// Ignore storage quota/private mode errors.
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
			// Ignore storage quota/private mode errors.
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
							messages: olderUnreadMessages.slice(
								0,
								sectionVisibleCounts.unread ?? SECTION_PAGE_SIZE
							),
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
		sectionVisibleCounts = {
			new: SECTION_PAGE_SIZE,
			unread: SECTION_PAGE_SIZE,
			read: SECTION_PAGE_SIZE
		};
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
				if (folder.id === routeId) {
					return [folder.id, messages.slice(0, requested), messages.length > requested] as const;
				}
				const cached = await getCachedMessagePreviews(accountId, folder.id, requested);
				return [folder.id, cached, cached.length >= requested] as const;
			})
		).then((entries) => {
			if (cancelled) return;
			sectionMessagesByFolder = Object.fromEntries(entries.map(([id, cached]) => [id, cached]));
			sectionHasMoreByFolder = Object.fromEntries(
				entries.map(([id, _, hasMoreFolder]) => [id, hasMoreFolder])
			);
		});

		return () => {
			cancelled = true;
		};
	});

	$effect(() => {
		settings.autoLoadMore;
		hasMore;
		loadingMore;
		const sentinel = loadSentinel;
		const load = onLoadMore;
		if (!settings.autoLoadMore || !hasMore || !load || !sentinel || sectionMode) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting && !loadingMore) load();
			},
			{ rootMargin: '240px' }
		);
		observer.observe(sentinel);
		return () => observer.disconnect();
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
		'z-mail-pane-surface flex min-h-0 min-w-0 flex-col overflow-hidden',
		sectionMode
			? 'flex-1 md:mx-auto md:w-full md:max-w-2xl'
			: 'flex-1 md:mx-auto md:w-full md:max-w-2xl',
		hideOnMobile ? (mail.hasSelection ? 'flex' : 'hidden md:flex') : 'flex'
	)}
	style="view-transition-name: message-list;"
	aria-label="{mailboxName} messages"
>
	{#if sectionMode && mailboxRouteId}
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
				<a class="z-mail-text-nav__link" href="/settings">Settings</a>
			</div>
		</div>
	{/if}

	<div class="z-pane-scroll min-h-0 flex-1 overflow-y-auto">
		{#if loading || error || showFlatEmpty}
			<MessageListStatus
				{loading}
				{error}
				empty={showFlatEmpty}
				emptyMessage={resolvedEmptyMessage}
				emptyHint={resolvedEmptyHint}
				{emptyIcon}
				{emptyActionHref}
				{emptyActionLabel}
				{mailboxRouteId}
				{onRetry}
			/>
		{:else if sectionMode}
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
											aria-current={currentMessageId === message.id ? 'page' : undefined}
										>
											<span
												class={cn(
													'z-mail-folder-section__subject',
													currentMessageId === message.id &&
														'z-mail-folder-section__subject--active',
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
					href={messageHref(message, searchReturnTo)}
					active={currentMessageId === message.id}
					{minimalChrome}
					{mailboxRouteId}
				/>
			{/each}

			<MessageListLoadMore
				{hasMore}
				{loadingMore}
				{onLoadMore}
				bind:loadSentinel
			/>
		{/if}
	</div>
</section>
