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
	import { cacheMessagePreviews, getCachedMessagePreviews } from '$lib/db/recent-threads';
	import { mapEmailPreview } from '$lib/jmap/map';
	import { isAccountSettingsSubject } from '$lib/settings/account-settings-types';
	import { auth } from '$lib/stores/auth.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import type { Mailbox, MessagePreview } from '$lib/types/mail';
	import { simpleContentPagePadClass } from '$lib/modes/simple/simple-content-layout';
	import { formatSimpleMessageTime, groupMessagesByDay } from '$lib/utils/dates';
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
	const INBOX_SECTION_PAGE_SIZE = 8;
	const FOLDER_SECTION_PAGE_SIZE = 3;
	const NEW_SECTION_ID = 'new';
	const UNREAD_SECTION_ID = 'unread';
	const READ_SECTION_ID = 'read';
	const INBOX_SECTION_IDS = new Set([NEW_SECTION_ID, UNREAD_SECTION_ID, READ_SECTION_ID]);
	const FOLDER_SECTION_SORT_BASE = 10;
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
	const mailHomeHref = $derived(settings.preferredMailHref());
	const minimalChrome = $derived(!settings.showReaderListRail && !!activeThreadId);
	const resolvedEmptyMessage = $derived(emptyMessage ?? defaultEmptyMessage(mailboxRouteId));
	const resolvedEmptyHint = $derived(
		emptyHint ?? (emptyMessage ? null : defaultEmptyHint(mailboxRouteId))
	);
	const showFlatEmpty = $derived(!sectionMode && !loading && !error && messages.length === 0);

	/** Matches ROLE_ORDER in mail.svelte.ts */
	const folderRoleOrder: Record<string, number> = {
		inbox: 0,
		drafts: 1,
		sent: 2,
		archive: 3,
		junk: 4,
		trash: 5
	};

	function sectionPageSize(sectionId: string): number {
		return INBOX_SECTION_IDS.has(sectionId) ? INBOX_SECTION_PAGE_SIZE : FOLDER_SECTION_PAGE_SIZE;
	}

	function simpleFolderSectionTitle(role: string | undefined, name: string): string {
		if (role === 'drafts') return 'Drafts';
		if (role === 'sent') return 'Sent';
		if (role === 'archive') return 'Archive';
		if (role === 'junk') return 'Spam';
		if (role === 'trash') return 'Deleted';
		return name;
	}

	function folderSectionSortOrder(folder: Mailbox): number {
		return FOLDER_SECTION_SORT_BASE + (folderRoleOrder[folder.role ?? ''] ?? 99);
	}

	function isMe(email: string): boolean {
		const cleanEmail = email?.trim().toLowerCase();
		if (!cleanEmail) return false;
		if (auth.username?.trim().toLowerCase() === cleanEmail) return true;
		return auth.identities.some((identity) => identity.email?.trim().toLowerCase() === cleanEmail);
	}

	function simpleSenderLabel(message: MessagePreview, folderRouteId: string): string {
		if (
			isMe(message.from.email) &&
			folderRouteId !== 'inbox' &&
			message.to &&
			message.to.length > 0
		) {
			const recipient = message.to[0];
			return `To ${recipient.name?.trim() || recipient.email}`;
		}
		const name = message.from.name?.trim();
		if (name) return name;
		if (settings.showSenderEmailInList) return message.from.email?.trim() || 'Unknown';
		const email = message.from.email?.trim();
		if (!email) return 'Unknown';
		return email.split('@')[0] ?? email;
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
	const readMessages = $derived.by(() => messages.filter((message) => !message.unread));

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
				const aRank = folderRoleOrder[a.role ?? ''] ?? 99;
				const bRank = folderRoleOrder[b.role ?? ''] ?? 99;
				if (aRank !== bRank) return aRank - bRank;
				return a.name.localeCompare(b.name);
			})
	);

	const folderSections = $derived.by(() => {
		const sections: {
			id: string;
			name: string;
			routeId: string;
			messages: MessagePreview[];
			totalCount: number;
			sortOrder: number;
		}[] = [];

		if (newUnreadMessages.length > 0) {
			sections.push({
				id: NEW_SECTION_ID,
				name: 'New',
				routeId: mailboxRouteId ?? 'inbox',
				messages: newUnreadMessages.slice(
					0,
					sectionVisibleCounts[NEW_SECTION_ID] ?? INBOX_SECTION_PAGE_SIZE
				),
				totalCount: newUnreadMessages.length,
				sortOrder: 0
			});
		}

		if (olderUnreadMessages.length > 0) {
			sections.push({
				id: UNREAD_SECTION_ID,
				name: 'Unread',
				routeId: mailboxRouteId ?? 'inbox',
				messages: olderUnreadMessages.slice(
					0,
					sectionVisibleCounts[UNREAD_SECTION_ID] ?? INBOX_SECTION_PAGE_SIZE
				),
				totalCount: olderUnreadMessages.length,
				sortOrder: 1
			});
		}

		for (const folder of orderedFolders) {
			const knownCount = sectionMessagesByFolder[folder.id]?.length ?? 0;
			if (knownCount === 0 && !sectionHasMoreByFolder[folder.id]) continue;

			const loaded = sectionMessagesByFolder[folder.id] ?? [];
			const limit = sectionVisibleCounts[folder.id] ?? FOLDER_SECTION_PAGE_SIZE;
			sections.push({
				id: folder.id,
				name: simpleFolderSectionTitle(folder.role, folder.name),
				routeId: folder.id,
				messages: loaded.slice(0, limit),
				totalCount: loaded.length,
				sortOrder: folderSectionSortOrder(folder)
			});
		}

		return sections.sort(
			(a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
		);
	});

	const visibleReadCount = $derived(
		sectionVisibleCounts[READ_SECTION_ID] ?? INBOX_SECTION_PAGE_SIZE
	);
	const visibleReadMessages = $derived(readMessages.slice(0, visibleReadCount));
	const readDayGroups = $derived(groupMessagesByDay(visibleReadMessages));
	const readMailboxRouteId = $derived(mailboxRouteId ?? 'inbox');

	$effect(() => {
		sectionMode;
		mailboxRouteId;
		sectionMessagesByFolder = {};
		sectionHasMoreByFolder = {};
		const counts: Record<string, number> = {
			[NEW_SECTION_ID]: INBOX_SECTION_PAGE_SIZE,
			[UNREAD_SECTION_ID]: INBOX_SECTION_PAGE_SIZE,
			[READ_SECTION_ID]: INBOX_SECTION_PAGE_SIZE
		};
		for (const folder of mail.mailboxes) {
			if (folder.id === 'unread' || folder.id === 'read' || folder.id === mailboxRouteId) continue;
			counts[folder.id] = FOLDER_SECTION_PAGE_SIZE;
		}
		sectionVisibleCounts = counts;
	});

	async function loadOtherFolderPreviews(
		client: NonNullable<typeof auth.client>,
		accountId: string,
		folder: Mailbox,
		limit: number
	): Promise<[MessagePreview[], boolean]> {
		const cached = (await getCachedMessagePreviews(accountId, folder.id, limit)).filter(
			(message) => !isAccountSettingsSubject(message.subject)
		);
		if (cached.length >= limit) {
			return [cached.slice(0, limit), true];
		}

		if (!folder.jmapId) {
			return [cached, false];
		}

		try {
			const { emails, hasMore } = await client.queryEmails(folder.jmapId, limit, 0);
			const previews = emails
				.filter((email) => !isAccountSettingsSubject(email.subject))
				.map((email) => mapEmailPreview(email, folder.id));
			if (browser && previews.length) {
				await cacheMessagePreviews(accountId, folder.id, previews);
			}
			return [previews, hasMore];
		} catch {
			return [cached, false];
		}
	}

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
				const requested = sectionVisibleCounts[folder.id] ?? FOLDER_SECTION_PAGE_SIZE;
				if (folder.id === routeId) {
					return [folder.id, messages.slice(0, requested), messages.length > requested] as const;
				}
				const [previews, hasMoreFolder] = await loadOtherFolderPreviews(
					client,
					accountId,
					folder,
					requested
				);
				return [folder.id, previews, hasMoreFolder] as const;
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

	function sectionCanShowMore(sectionId: string): boolean {
		const visible = sectionVisibleCounts[sectionId] ?? sectionPageSize(sectionId);
		if (sectionId === NEW_SECTION_ID) return newUnreadMessages.length > visible;
		if (sectionId === UNREAD_SECTION_ID) return olderUnreadMessages.length > visible;
		if (sectionId === READ_SECTION_ID) {
			return readMessages.length > visible || hasMore;
		}
		const known = sectionMessagesByFolder[sectionId]?.length ?? 0;
		return known > visible || !!sectionHasMoreByFolder[sectionId];
	}

	function revealMoreInSection(sectionId: string) {
		const step = sectionPageSize(sectionId);
		const nextVisible = (sectionVisibleCounts[sectionId] ?? step) + step;
		sectionVisibleCounts = {
			...sectionVisibleCounts,
			[sectionId]: nextVisible
		};
		if (
			sectionId === READ_SECTION_ID &&
			hasMore &&
			onLoadMore &&
			nextVisible >= readMessages.length
		) {
			onLoadMore();
		}
	}
</script>

<section
	class={cn(
		'z-mail-pane-surface z-mail-pane-surface--flow flex w-full min-w-0 flex-col',
		hideOnMobile ? (mail.hasSelection ? 'flex' : 'hidden md:flex') : 'flex'
	)}
	style="view-transition-name: message-list;"
	aria-label="{mailboxName} messages"
>
	<div class={cn(simpleContentPagePadClass(settings.compactSettingsLayout), 'flex flex-col')}>
	{#if sectionMode && mailboxRouteId}
		<div class="z-mail-text-nav">
			<h1 class="z-mail-text-nav__title">
				<a href={mailHomeHref}>ZAUR Mail</a>
			</h1>
		</div>
	{/if}

	<div class="z-mail-list-flow">
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
			{#snippet simpleMessageRow(message: MessagePreview, routeId: string)}
				<a
					href={sectionMessageHref(message, routeId)}
					class="z-mail-folder-section__message"
					aria-current={currentMessageId === message.id ? 'page' : undefined}
					aria-label="{message.subject.trim() || '(no subject)'} — {simpleSenderLabel(message, routeId)}"
				>
					<time class="z-mail-folder-section__time" datetime={message.receivedAt}>
						{formatSimpleMessageTime(message.receivedAt, settings.timeFormat)}
					</time>
					<span
						class={cn(
							'z-mail-folder-section__subject',
							currentMessageId === message.id && 'z-mail-folder-section__subject--active'
						)}
					>
						{message.subject.trim() || '(no subject)'}
					</span>
					<span class="z-mail-folder-section__sender">
						{simpleSenderLabel(message, routeId)}
					</span>
				</a>
			{/snippet}

			<div class="z-mail-folder-sections">
				{#each folderSections as section (section.id)}
					<section class="z-mail-folder-section" style:order={section.sortOrder}>
						<div class="z-mail-folder-section__head">
							<h2 class="z-mail-folder-section__title">{section.name}</h2>
							<span class="z-mail-folder-section__count">{section.totalCount}</span>
						</div>
						<ul class="z-mail-folder-section__list">
							{#each section.messages as message (message.id)}
								<li>
									{@render simpleMessageRow(message, section.routeId)}
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
					</section>
				{/each}

				{#if readDayGroups.length > 0}
					<div class="z-mail-read-by-day" style:order="2">
						{#each readDayGroups as dayGroup (dayGroup.dayKey)}
							<section class="z-mail-folder-section z-mail-folder-section--day">
								<div class="z-mail-folder-section__head">
									<h2 class="z-mail-folder-section__title">{dayGroup.heading}</h2>
								</div>
								<ul class="z-mail-folder-section__list">
									{#each dayGroup.messages as message (message.id)}
										<li>
											{@render simpleMessageRow(message, readMailboxRouteId)}
										</li>
									{/each}
								</ul>
							</section>
						{/each}
						{#if sectionCanShowMore(READ_SECTION_ID)}
							<div class="z-mail-folder-section__footer">
								<button
									type="button"
									class="z-mail-folder-section__more"
									onclick={() => revealMoreInSection(READ_SECTION_ID)}
								>
									Show more
								</button>
							</div>
						{/if}
					</div>
				{:else if folderSections.length === 0 && readDayGroups.length === 0}
					<p class="z-mail-folder-section__empty">No messages yet.</p>
				{/if}
			</div>
			<div class="z-mail-text-nav__footer">
				<a class="z-mail-text-nav__link" href="/settings">Settings</a>
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
	</div>
</section>
