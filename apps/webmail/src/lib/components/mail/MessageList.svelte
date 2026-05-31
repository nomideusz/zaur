<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import MessageListHeader from '$lib/components/mail/MessageListHeader.svelte';
	import MessageListLoadMore from '$lib/components/mail/MessageListLoadMore.svelte';
	import MessageListMobileBar from '$lib/components/mail/MessageListMobileBar.svelte';
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
	import MailTextNav from '$lib/components/mail/MailTextNav.svelte';
	import { contentPagePadClass } from '$lib/mail/layout';
	import {
		formatSimpleListWhen,
		simpleMessageDayKey,
		formatSimpleListTime,
		formatSimpleListDayHeading
	} from '$lib/utils/dates';
	import { cn } from '$lib/utils/cn';
	import { supportsMobileListGestures } from '$lib/utils/pointer-env';

	/** Editorial list row — shared Tailwind building blocks. */
	const listMessageGroup = 'group/message';
	const listMessageLinkClass = cn(listMessageGroup, 'block min-w-0 no-underline');
	const listMessageSelectClass = cn(
		listMessageGroup,
		'flex w-full cursor-pointer items-start gap-3 border-0 bg-transparent p-0 text-left'
	);
	const listMessageStackClass = 'flex min-w-0 flex-row items-start justify-between gap-4';
	const listMessageLeadClass = 'flex min-w-0 flex-1 flex-col gap-0.5';
	const listSubjectClass = cn(
		'block min-w-0 font-normal text-fg underline underline-offset-[0.2em] decoration-fg/35 decoration-1',
		'z-type-page leading-[1.4] [overflow-wrap:anywhere]',
		'transition-[color,text-decoration-color] duration-150',
		'group-hover/message:decoration-fg/55 group-focus-visible/message:decoration-fg/55'
	);
	const listWhenClass = cn(
		'shrink-0 tabular-nums text-fg-muted no-underline z-type-page leading-[1.4] pt-[0.05em]',
		'group-hover/message:text-fg group-focus-visible/message:text-fg'
	);
	const listSenderClass = (visible: boolean) =>
		cn('hidden z-type-page leading-[1.4] text-fg-muted', visible && 'block');
	const listSectionCountClass = (sectionId: string) =>
		cn(
			'z-type-list-count shrink-0 tabular-nums font-semibold text-fg',
			sectionId === READ_SECTION_ID && 'font-medium text-fg-muted'
		);
	const listMoreClass = cn(
		'z-type-page cursor-pointer font-normal text-fg underline underline-offset-2 decoration-fg/30',
		'transition hover:decoration-fg/55 active:scale-[0.98]'
	);

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
		onRetry,
		onBulkAction
	}: MessageListProps = $props();

	let loadSentinel = $state<HTMLDivElement | null>(null);
	let longPressTimer = $state<ReturnType<typeof setTimeout> | null>(null);
	let longPressMessageId = $state<string | null>(null);
	let sectionMessagesByFolder = $state<Record<string, MessagePreview[]>>({});
	let sectionVisibleCounts = $state<Record<string, number>>({});
	let sectionHasMoreByFolder = $state<Record<string, boolean>>({});
	const INBOX_SECTION_PAGE_SIZE = 8;
	const FOLDER_SECTION_PAGE_SIZE = 3;
	const NEW_SECTION_ID = 'new';
	const IMPORTANT_SECTION_ID = 'important';
	const READ_SECTION_ID = 'read';
	const INBOX_SECTION_IDS = new Set([NEW_SECTION_ID, IMPORTANT_SECTION_ID, READ_SECTION_ID]);
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
	/** Sectioned folder lists — thread/search use a flat editorial list. */
	const sectionMode = $derived(!!mailboxRouteId && !activeThreadId);
	const isInboxHome = $derived(sectionMode && mailboxRouteId === 'inbox');
	const mailHomeHref = $derived(settings.preferredMailHref());
	const resolvedEmptyMessage = $derived(emptyMessage ?? defaultEmptyMessage(mailboxRouteId));
	const resolvedEmptyHint = $derived(
		emptyHint ?? (emptyMessage ? null : defaultEmptyHint(mailboxRouteId))
	);
	const showFlatEmpty = $derived(!sectionMode && !loading && !error && messages.length === 0);
	const selectedIds = $derived([...mail.selectedMessageIds]);
	const bulkSelectEnabled = $derived(!!mailboxRouteId && settings.showBulkSelect);
	const showListHeader = $derived(bulkSelectEnabled);
	const showMobileSelectionBar = $derived(
		!!mailboxRouteId && mail.hasSelection && supportsMobileListGestures()
	);

	$effect(() => {
		if (!settings.showBulkSelect && mail.hasSelection) {
			mail.clearSelection();
		}
	});

	function clearLongPressTimer() {
		if (longPressTimer) {
			clearTimeout(longPressTimer);
			longPressTimer = null;
		}
		longPressMessageId = null;
	}

	function handleRowLongPressStart(messageId: string, event: PointerEvent) {
		if (!bulkSelectEnabled || !supportsMobileListGestures() || event.pointerType === 'mouse') {
			return;
		}
		clearLongPressTimer();
		longPressMessageId = messageId;
		longPressTimer = setTimeout(() => {
			mail.startSelection(messageId);
			clearLongPressTimer();
		}, 450);
	}

	function handleRowLongPressMove(event: PointerEvent) {
		if (!longPressTimer) return;
		if (Math.abs(event.movementX) > 10 || Math.abs(event.movementY) > 10) {
			clearLongPressTimer();
		}
	}

	function handleRowSelect(
		messageId: string,
		modifiers: { shift?: boolean; ctrl?: boolean } = {}
	) {
		mail.selectMessageAt(messageId, {
			...modifiers,
			activeMessageId: currentMessageId
		});
	}

	function handleRowPointerSelect(messageId: string, event: MouseEvent) {
		handleRowSelect(messageId, {
			shift: event.shiftKey,
			ctrl: event.ctrlKey || event.metaKey
		});
	}

	function handleRowLinkClick(messageId: string, event: MouseEvent) {
		if (!bulkSelectEnabled) return;
		const shift = event.shiftKey;
		const ctrl = event.ctrlKey || event.metaKey;
		if (!mail.hasSelection && !shift && !ctrl) return;
		event.preventDefault();
		handleRowPointerSelect(messageId, event);
	}

	function handleRowCheckboxClick(messageId: string, event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
		if (mail.hasSelection) {
			handleRowPointerSelect(messageId, event);
			return;
		}
		if (currentMessageId === messageId) {
			mail.startSelection(messageId);
		}
	}

	/** Matches ROLE_ORDER in mail.svelte.ts */
	const folderRoleOrder: Record<string, number> = {
		inbox: 0,
		drafts: 1,
		sent: 2,
		archive: 3,
		junk: 4,
		trash: 5
	};


	function folderSectionCollapsedByDefault(folder: Mailbox): boolean {
		// All folders below inbox start collapsed — minimal list of folders only.
		// Messages are revealed on demand via "Show messages".
		return true;
	}

	function defaultSectionVisibleCount(sectionId: string, folder?: Mailbox): number {
		if (folder && folderSectionCollapsedByDefault(folder)) return 0;
		if (INBOX_SECTION_IDS.has(sectionId)) return INBOX_SECTION_PAGE_SIZE;
		if (mailboxRouteId && sectionId === mailboxRouteId) return INBOX_SECTION_PAGE_SIZE;
		return FOLDER_SECTION_PAGE_SIZE;
	}

	function sectionRevealLabel(sectionId: string, totalCount: number): string {
		const visible = sectionVisibleCounts[sectionId] ?? 0;
		const revealBy = Math.max(1, sectionPageSize(sectionId));
		let hidden = Math.max(totalCount - visible, 0);
		if (sectionId === READ_SECTION_ID && hasMore && visible >= readMessages.length) {
			hidden = Math.max(hidden, revealBy);
		}
		if (visible === 0) {
			const firstRevealCount = Math.min(hidden, revealBy);
			if (firstRevealCount > 0) {
				return `Show ${firstRevealCount} message${firstRevealCount === 1 ? '' : 's'}`;
			}
			return 'Show messages';
		}
		if (hidden > 0) {
			const nextRevealCount = Math.min(hidden, revealBy);
			return `Show ${nextRevealCount} more`;
		}
		return 'Show more';
	}

	function sectionPageSize(sectionId: string): number {
		if (INBOX_SECTION_IDS.has(sectionId)) return INBOX_SECTION_PAGE_SIZE;
		if (mailboxRouteId && sectionId === mailboxRouteId && !isInboxHome) {
			return INBOX_SECTION_PAGE_SIZE;
		}
		return FOLDER_SECTION_PAGE_SIZE;
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
	const importantMessages = $derived.by(() =>
		messages.filter((message) => message.important && !isNewUnreadMessage(message))
	);
	const readMessages = $derived.by(() =>
		messages.filter((message) => !message.important && !isNewUnreadMessage(message))
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
			showUnreadDot: boolean;
		}[] = [];

		if (isInboxHome) {
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
					sortOrder: 0,
					showUnreadDot: true
				});
			}

			if (importantMessages.length > 0) {
				sections.push({
					id: IMPORTANT_SECTION_ID,
					name: 'Important',
					routeId: mailboxRouteId ?? 'inbox',
					messages: importantMessages.slice(
						0,
						sectionVisibleCounts[IMPORTANT_SECTION_ID] ?? INBOX_SECTION_PAGE_SIZE
					),
					totalCount: importantMessages.length,
					sortOrder: 1,
					showUnreadDot: true
				});
			}

			// Folders below inbox are not shown in the main list (to avoid distraction).
			// A minimal navigation row is rendered after the message list instead.

			if (readMessages.length > 0) {
				sections.push({
					id: READ_SECTION_ID,
					name: 'Inbox',
					routeId: mailboxRouteId ?? 'inbox',
					messages: readMessages.slice(
						0,
						sectionVisibleCounts[READ_SECTION_ID] ?? INBOX_SECTION_PAGE_SIZE
					),
					totalCount: readMessages.length,
					sortOrder: 2,
					showUnreadDot: false
				});
			}
		} else if (mailboxRouteId && messages.length > 0) {
			const mailbox = mail.mailboxByRouteId(mailboxRouteId);
			const collapsed = mailbox ? folderSectionCollapsedByDefault(mailbox) : false;
			const limit =
				sectionVisibleCounts[mailboxRouteId] ?? (collapsed ? 0 : INBOX_SECTION_PAGE_SIZE);
			sections.push({
				id: mailboxRouteId,
				name: simpleFolderSectionTitle(mailbox?.role, mailbox?.name ?? mailboxName),
				routeId: mailboxRouteId,
				messages: messages.slice(0, limit),
				totalCount: mailbox?.total ?? messages.length,
				sortOrder: 0,
				showUnreadDot: (mailbox?.unread ?? 0) > 0
			});
		}

		return sections.sort(
			(a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
		);
	});

	$effect(() => {
		sectionMode;
		mailboxRouteId;
		sectionMessagesByFolder = {};
		sectionHasMoreByFolder = {};
		const counts: Record<string, number> = {
			[NEW_SECTION_ID]: INBOX_SECTION_PAGE_SIZE,
			[IMPORTANT_SECTION_ID]: INBOX_SECTION_PAGE_SIZE,
			[READ_SECTION_ID]: INBOX_SECTION_PAGE_SIZE
		};
		if (mailboxRouteId && mailboxRouteId !== 'inbox') {
			const mailbox = mail.mailboxByRouteId(mailboxRouteId);
			counts[mailboxRouteId] = defaultSectionVisibleCount(mailboxRouteId, mailbox);
		}
		for (const folder of mail.mailboxes) {
			if (folder.id === 'unread' || folder.id === 'read' || folder.id === mailboxRouteId) continue;
			counts[folder.id] = defaultSectionVisibleCount(folder.id, folder);
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
		const inboxHome = isInboxHome;
		messages;
		sectionVisibleCounts;

		if (!useSectionMode || !client || !routeId || !inboxHome || folders.length === 0) {
			sectionMessagesByFolder = {};
			return;
		}

		let cancelled = false;
		const accountId = client.getAccountId();

		void Promise.all(
			folders.map(async (folder) => {
				const requested =
					sectionVisibleCounts[folder.id] ??
					(folderSectionCollapsedByDefault(folder) ? 0 : FOLDER_SECTION_PAGE_SIZE);
				if (requested === 0) {
					return [folder.id, [] as MessagePreview[], folder.total > 0] as const;
				}
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

	function listRowStartsNewDay(messages: MessagePreview[], index: number): boolean {
		if (index === 0) return true;
		return (
			simpleMessageDayKey(messages[index].receivedAt) !==
			simpleMessageDayKey(messages[index - 1].receivedAt)
		);
	}

	function sectionMessageHref(message: MessagePreview, folderId: string): string {
		const params = new URLSearchParams();
		params.set('messageId', message.id);
		return `/mail/${folderId}/${message.threadId}?${params.toString()}`;
	}

	function listMessageHref(message: MessagePreview, routeId: string): string {
		if (searchReturnTo) {
			return messageHref(message, searchReturnTo);
		}
		return sectionMessageHref(message, routeId);
	}

	function messageSubjectKey(message: MessagePreview): string {
		return (message.subject.trim() || '(no subject)').toLowerCase();
	}

	function duplicateSubjectKeys(messages: MessagePreview[]): Set<string> {
		const counts = new Map<string, number>();
		for (const message of messages) {
			const key = messageSubjectKey(message);
			counts.set(key, (counts.get(key) ?? 0) + 1);
		}
		const dupes = new Set<string>();
		for (const [key, count] of counts) {
			if (count > 1) dupes.add(key);
		}
		return dupes;
	}

	const flatListDuplicateSubjects = $derived(duplicateSubjectKeys(messages));

	function sectionCanShowMore(sectionId: string): boolean {
		const visible = sectionVisibleCounts[sectionId] ?? sectionPageSize(sectionId);
		if (sectionId === NEW_SECTION_ID) return newUnreadMessages.length > visible;
		if (sectionId === IMPORTANT_SECTION_ID) return importantMessages.length > visible;
		if (sectionId === READ_SECTION_ID) {
			return readMessages.length > visible || hasMore;
		}
		if (!isInboxHome && sectionId === mailboxRouteId) {
			const mailbox = mail.mailboxByRouteId(mailboxRouteId);
			if (visible === 0 && mailbox && folderSectionCollapsedByDefault(mailbox)) {
				return messages.length > 0 || hasMore;
			}
			return messages.length > visible || hasMore;
		}
		const folder = mail.mailboxByRouteId(sectionId);
		if (visible === 0 && folder && folderSectionCollapsedByDefault(folder)) {
			return (
				folder.total > 0 ||
				(sectionMessagesByFolder[sectionId]?.length ?? 0) > 0 ||
				!!sectionHasMoreByFolder[sectionId]
			);
		}
		const known = sectionMessagesByFolder[sectionId]?.length ?? 0;
		return known > visible || !!sectionHasMoreByFolder[sectionId];
	}

	function revealMoreInSection(sectionId: string) {
		const step = sectionPageSize(sectionId);
		const current = sectionVisibleCounts[sectionId] ?? 0;
		const nextVisible = current === 0 ? step : current + step;
		sectionVisibleCounts = {
			...sectionVisibleCounts,
			[sectionId]: nextVisible
		};
		const shouldLoadMore =
			hasMore &&
			onLoadMore &&
			(sectionId === READ_SECTION_ID
				? nextVisible >= readMessages.length
				: !isInboxHome && sectionId === mailboxRouteId
					? nextVisible >= messages.length
					: false);
		if (shouldLoadMore) {
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
	<div
		class={cn(
			contentPagePadClass(),
			'flex flex-col',
			showMobileSelectionBar && 'z-mail-list-scroll--with-bar'
		)}
	>
	{#if mailboxRouteId || !sectionMode}
		<MailTextNav
			title={isInboxHome ? 'ZAUR Mail' : mailboxName}
			titleHref={isInboxHome ? mailHomeHref : null}
			actionHref="/mail/compose"
			actionLabel="New message"
			showBackToMail={!isInboxHome}
			backHref={mailHomeHref}
			showSettings={false}
		/>
	{/if}

	{#if showListHeader}
		<MessageListHeader
			{mailboxRouteId}
			{onBulkAction}
			disabled={!!mailboxRouteId && (loading || !!error || !messages.length)}
		/>
	{/if}

	<div class="z-mail-list-flow">
		{#snippet simpleMessageRow(
			message: MessagePreview,
			routeId: string,
			index: number,
			messagesList: MessagePreview[],
			duplicateKeys: Set<string> = flatListDuplicateSubjects
		)}
			{@const isNewDay = listRowStartsNewDay(messagesList, index)}
			{@const senderLabel = simpleSenderLabel(message, routeId)}
			{@const subjectText = message.subject.trim() || '(no subject)'}
			{@const baseTimeLabel = formatSimpleListTime(message.receivedAt, settings.timeFormat)}
			{@const timeLabel = isNewDay
				? `${formatSimpleListDayHeading(message.receivedAt)} ${baseTimeLabel}`
				: baseTimeLabel}
			{@const showSenderDuplicate = duplicateKeys.has(messageSubjectKey(message))}
			{@const rowSelected = bulkSelectEnabled && selectedIds.includes(message.id)}
			{@const showRowCheckbox =
				bulkSelectEnabled && (mail.hasSelection || currentMessageId === message.id)}
			{@const rowHref = listMessageHref(message, routeId)}
			<li class={cn('list-none', rowSelected && '[&_.list-subject]:text-accent')}>
				{#if mail.hasSelection && bulkSelectEnabled}
					<button
						type="button"
						class={listMessageSelectClass}
						aria-current={currentMessageId === message.id ? 'page' : undefined}
						aria-pressed={rowSelected}
						aria-label="{subjectText} — {senderLabel}, {timeLabel}"
						onclick={(event) => handleRowPointerSelect(message.id, event)}
					>
						{#if showRowCheckbox}
							<input
								type="checkbox"
								class="z-checkbox mt-[0.35rem] shrink-0"
								checked={rowSelected}
								tabindex="-1"
								aria-hidden="true"
							/>
						{/if}
						<span class={listMessageStackClass}>
							<span class={listMessageLeadClass}>
								<span class={cn(listSubjectClass, 'list-subject')}>{subjectText}</span>
								<span class={listSenderClass(showSenderDuplicate)}>{senderLabel}</span>
							</span>
							<time class={listWhenClass} datetime={message.receivedAt}>
								{timeLabel}
							</time>
						</span>
					</button>
				{:else}
					<a
						href={rowHref}
						class={listMessageLinkClass}
						aria-current={currentMessageId === message.id ? 'page' : undefined}
						aria-label="{subjectText} — {senderLabel}, {timeLabel}"
						onclick={(event) => handleRowLinkClick(message.id, event)}
						onpointerdown={(event) => handleRowLongPressStart(message.id, event)}
						onpointermove={handleRowLongPressMove}
						onpointerup={clearLongPressTimer}
						onpointercancel={clearLongPressTimer}
					>
						{#if showRowCheckbox}
							<input
								type="checkbox"
								class="z-checkbox mt-[0.35rem] shrink-0"
								checked={rowSelected}
								aria-label={`Select ${subjectText}`}
								onclick={(event) => handleRowCheckboxClick(message.id, event)}
							/>
						{/if}
						<span class={listMessageStackClass}>
							<span class={listMessageLeadClass}>
								<span class={cn(listSubjectClass, 'list-subject')}>{subjectText}</span>
								<span class={listSenderClass(showSenderDuplicate)}>{senderLabel}</span>
							</span>
							<time class={listWhenClass} datetime={message.receivedAt}>
								{timeLabel}
							</time>
						</span>
					</a>
				{/if}
			</li>
		{/snippet}

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
			<div class="z-mail-list-sections">
				{#each folderSections as section, sectionIndex (section.id)}
					{@const sectionDuplicateSubjects = duplicateSubjectKeys(section.messages)}
					<section style:order={section.sortOrder} style:--section-index={sectionIndex}>
						<div class="z-mail-list-section-head">
							<h2 class="z-mail-list-section-title">
								{#if section.showUnreadDot}
									<span
										class="size-[0.4375rem] shrink-0 rounded-full bg-unread"
										aria-hidden="true"
									></span>
								{/if}
								{section.name}
							</h2>
							<span class={listSectionCountClass(section.id)}>{section.totalCount}</span>
						</div>
						{#if section.messages.length > 0}
							<ul class="z-mail-list-section-messages">
								{#each section.messages as message, index (message.id)}
									{@render simpleMessageRow(message, section.routeId, index, section.messages, sectionDuplicateSubjects)}
								{/each}
							</ul>
						{/if}
						{#if sectionCanShowMore(section.id)}
							<div class="z-mail-list-section-more">
								<button type="button" class={listMoreClass} onclick={() => revealMoreInSection(section.id)}>
									{sectionRevealLabel(section.id, section.totalCount)}
								</button>
							</div>
						{/if}
					</section>
				{/each}

				{#if folderSections.length === 0}
					<p class="z-type-page leading-[1.55] font-normal text-fg">{resolvedEmptyMessage}</p>
				{/if}
			</div>

			{#if isInboxHome && orderedFolders.length > 0}
				<nav
					class="z-mail-list-folders z-type-page-muted flex flex-wrap items-center gap-x-3 gap-y-1 text-fg-muted"
					aria-label="Folders"
				>
					{#each orderedFolders as folder (folder.id)}
						<a
							href={`/mail/${folder.id}`}
							class="inline-flex items-baseline gap-1.5 text-fg-muted no-underline transition-colors hover:text-fg"
						>
							<span>{simpleFolderSectionTitle(folder.role, folder.name)}</span>
							<span class="z-type-list-count tabular-nums font-semibold">{folder.total}</span>
						</a>
					{/each}
				</nav>
			{/if}
		{:else}
			<ul class="flex flex-col gap-2.5">
				{#each messages as message, index (message.id)}
					{@render simpleMessageRow(message, mailboxRouteId ?? message.mailboxId, index, messages)}
				{/each}
			</ul>

			<MessageListLoadMore
				{hasMore}
				{loadingMore}
				{onLoadMore}
				bind:loadSentinel
			/>
		{/if}
	</div>
	<div class="z-mail-text-nav__links mt-[var(--z-main-gap)]!">
		<a class="z-mail-text-nav__link" href="/settings">Settings</a>
		<span class="z-mail-text-nav__sep">·</span>
		<button
			type="button"
			class="z-mail-text-nav__link"
			onclick={() => {
				if (confirm('Sign out of ZAUR Webmail on this device?')) {
					auth.logout();
				}
			}}
		>
			Sign out
		</button>
	</div>
		{#if showMobileSelectionBar && mailboxRouteId}
			<MessageListMobileBar {mailboxRouteId} {onBulkAction} />
		{/if}
	</div>
</section>
