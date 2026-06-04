<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { untrack } from 'svelte';
	import MessageListLoadMore from '$lib/components/mail/MessageListLoadMore.svelte';
	import MessageListBulkHeader from '$lib/components/mail/MessageListBulkHeader.svelte';
	import MessageListStatus from '$lib/components/mail/MessageListStatus.svelte';
	import Paperclip from '$lib/components/icons/Paperclip.svelte';
	import Palette from '$lib/components/icons/Palette.svelte';
	import {
		listSwipeContext,
		listSwipeLeadingActions,
		listSwipeTrailingActions,
		type ListSwipeAction
	} from '$lib/mail/list-swipe-actions';
	import SwipeableListRow, {
		type SwipeAction
	} from '$lib/components/ui/SwipeableListRow.svelte';
	import type { MessageListProps } from '$lib/components/mail/message-list-props';
	import {
		activeMessageId,
		collapseMessagesByThread,
		defaultEmptyHint,
		defaultEmptyMessage,
		indexMessagesByThreadId,
		listThreadSenderLabel,
		messageHref
	} from '$lib/components/mail/message-list-utils';
	import { cacheMessagePreviews, getCachedMessagePreviews } from '$lib/db/recent-threads';
	import { mapEmailPreview } from '$lib/jmap/map';
	import { isAccountSettingsSubject } from '$lib/settings/account-settings-types';
	import { auth } from '$lib/stores/auth.svelte';
	import { appConfig } from '$lib/config';
	import { mail } from '$lib/stores/mail.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import type { Mailbox, MessagePreview } from '$lib/types/mail';
	import { mailThreadHref } from '$lib/mail/routes';
	import { mailboxKindOrderForMailbox } from '$lib/mail/mailboxes';
	import { formatMessageListWhen } from '$lib/utils/dates';
	import { cn } from '$lib/utils/cn';
	import { hasPreciseHover, supportsMobileListGestures } from '$lib/utils/pointer-env';
	import { importantRainbow } from '$lib/mail/important-rainbow.svelte';
	import { LABEL_NOT_IMPORTANT } from '$lib/mail/new-mail';
	import { inboxNormalSectionDefaultVisible, inboxImportantSectionCanShowMore } from '$lib/mail/inbox-list-sections';
	import {
		canMarkImportantFromMailboxRole,
		isExcludedFromImportantSection,
		shouldPresentImportantColors
	} from '$lib/mail/mailboxes';

	const listRowLinkClass = (current: boolean) =>
		cn(
			'z-list-row flex w-full min-w-0 items-start gap-3 px-4 py-2.5 text-left no-underline transition-colors hover:bg-surface-sunken/60',
			current && 'z-list-row--current'
		);
	const listSenderClass = (unread: boolean) =>
		cn('min-w-0 truncate text-sm', unread ? 'font-semibold text-fg' : 'font-medium text-fg-muted');
	const listSubjectClass = (unread: boolean, important: boolean) =>
		cn(
			'min-w-0 truncate text-sm',
			important && 'z-mail-list-subject--important font-semibold',
			!important && (unread ? 'font-semibold text-fg' : 'font-medium text-fg')
		);
	const listPreviewClass = 'min-w-0 truncate text-xs text-fg-muted';
	const listTimeClass = 'shrink-0 text-xs tabular-nums text-fg-subtle';

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

	/** Important row currently hovered — only that row may persist a rainbow pick. */
	let importantRainbowHoverId = $state<string | null>(null);
	/** After bulk-select long-press, block the following link navigation. */
	let suppressRowNavigationUntil = 0;

	const mobileRowGestures = $derived(supportsMobileListGestures());

	$effect(() => {
		void $page.url.pathname;
		importantRainbowHoverId = null;
	});

	function shouldPersistRainbowPick(event: PointerEvent): boolean {
		const row = event.currentTarget;
		if (!(row instanceof HTMLElement) || !row.isConnected) return false;
		const related = event.relatedTarget;
		if (related === null) return false;
		if (related instanceof Node && !document.contains(related)) return false;
		return true;
	}

	function persistImportantRainbowPick(messageId: string, row: HTMLElement, event: PointerEvent) {
		if (settings.reduceMotion || !hasPreciseHover()) return;
		if (!shouldPersistRainbowPick(event)) return;
		if (importantRainbowHoverId !== messageId) return;
		importantRainbowHoverId = null;
		importantRainbow.pickFromRow(row, messageId);
	}

	const activeThreadId = $derived($page.params.threadId);
	const searchReturnTo = $derived.by(() => {
		if ($page.url.pathname !== '/mail/search') return null;
		return `${$page.url.pathname}${$page.url.search}`;
	});
	const messagesByThreadId = $derived(indexMessagesByThreadId(messages));
	const listMessages = $derived.by(() => {
		const collapsed = collapseMessagesByThread(messages);
		if (mailboxRouteId === IMPORTANT_SECTION_ID) {
			return collapsed.filter((message) => message.important);
		}
		return collapsed;
	});
	const currentMessageId = $derived(
		activeMessageId(
			listMessages,
			$page.url.searchParams.get('messageId'),
			activeThreadId
		)
	);
	/** Mailbox/search list (flat rows); thread view uses search flat mode. */
	const sectionMode = $derived(!!mailboxRouteId && !activeThreadId);
	const isInboxHome = $derived(sectionMode && mailboxRouteId === 'inbox');
	const resolvedEmptyMessage = $derived(emptyMessage ?? defaultEmptyMessage(mailboxRouteId));
	const resolvedEmptyHint = $derived(
		emptyHint ?? (emptyMessage ? null : defaultEmptyHint(mailboxRouteId))
	);
	const showFlatEmpty = $derived(!sectionMode && !loading && !error && messages.length === 0);
	const selectedIds = $derived([...mail.selectedMessageIds]);
	const bulkSelectEnabled = $derived(!!mailboxRouteId);
	const bulkSelectionMessages = $derived(listMessages);

	function sameMessageIds(a: MessagePreview[], b: MessagePreview[]): boolean {
		if (a.length !== b.length) return false;
		return a.every((message, index) => message.id === b[index]?.id);
	}

	$effect(() => {
		const next = !bulkSelectEnabled ? [] : sectionMode ? bulkSelectionMessages : [];
		const current = untrack(() => mail.selectionList);
		if (sameMessageIds(current, next)) return;
		mail.setSelectionList(next);
	});
	const showBulkBar = $derived(bulkSelectEnabled && mail.hasSelection && !!mailboxRouteId);
	/** Desktop: checkbox in DOM for gutter hover. Mobile: only once selection mode is active. */
	const showRowCheckbox = $derived(
		bulkSelectEnabled && (!supportsMobileListGestures() || mail.hasSelection)
	);

	function handleMobileBulkLongPress(messageId: string) {
		mail.startSelection(messageId);
		suppressRowNavigationUntil = Date.now() + 400;
	}

	function swipeContext(message: MessagePreview, routeId: string) {
		const mailbox = mail.mailboxByRouteId(routeId);
		return listSwipeContext(message, mailbox, {
			canMarkImportant: mail.canMarkImportantInMailbox(mailbox),
			hasInbox: mail.mailboxes.some((mb) => mb.role === 'inbox' && mb.jmapId)
		});
	}

	function toSwipeActions(
		actions: ListSwipeAction[],
		message: MessagePreview,
		routeId: string
	): SwipeAction[] {
		return actions.map((action) => ({
			id: action.id,
			label: action.label,
			variant: action.variant,
			onAction: () => void runSwipeAction(action.id, message, routeId)
		}));
	}

	function listSwipeLeading(message: MessagePreview, routeId: string): SwipeAction[] {
		return toSwipeActions(listSwipeLeadingActions(swipeContext(message, routeId)), message, routeId);
	}

	function listSwipeTrailing(message: MessagePreview, routeId: string): SwipeAction[] {
		return toSwipeActions(
			listSwipeTrailingActions(swipeContext(message, routeId)),
			message,
			routeId
		);
	}

	async function runSwipeAction(actionId: string, message: MessagePreview, routeId: string) {
		if (!auth.client) return;

		switch (actionId) {
			case 'move-inbox':
				return swipeMoveToInbox(message, routeId);
			case 'mark-important':
				return swipeToggleImportant(message);
			case 'done':
				return swipeDone(message);
			case 'trash':
			case 'delete-forever':
			case 'delete-draft':
				return swipeDeleteMessage(message, routeId);
		}
	}

	async function swipeMoveToInbox(message: MessagePreview, routeId: string) {
		if (!auth.client) return;
		try {
			await mail.moveMessage(auth.client, message, 'inbox');
			onBulkAction?.();
		} catch (err) {
			const text = err instanceof Error ? err.message : 'Move failed';
			toast.show(text, 'error');
		}
	}

	async function swipeToggleImportant(message: MessagePreview) {
		if (!auth.client) return;
		try {
			await mail.toggleImportant(auth.client, message);
			onBulkAction?.();
		} catch (err) {
			const text = err instanceof Error ? err.message : 'Could not update important';
			toast.show(text, 'error');
		}
	}

	async function swipeDone(message: MessagePreview) {
		if (!auth.client) return;
		try {
			await mail.fileAsNotImportant(auth.client, message);
			onBulkAction?.();
		} catch (err) {
			const text = err instanceof Error ? err.message : `Could not mark ${LABEL_NOT_IMPORTANT.toLowerCase()}`;
			toast.show(text, 'error');
		}
	}

	async function swipeDeleteMessage(message: MessagePreview, routeId: string) {
		if (!auth.client) return;
		const mailbox = mail.mailboxByRouteId(routeId);
		const permanent = mailbox?.role === 'trash' || mailbox?.role === 'drafts';
		if (!settings.confirmDeleteMessage(1, permanent)) return;
		try {
			await mail.deleteMessage(auth.client, message, routeId);
			onBulkAction?.();
		} catch (err) {
			const text = err instanceof Error ? err.message : 'Delete failed';
			toast.show(text, 'error');
		}
	}

	function cycleImportantColor(messageId: string, event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
		importantRainbow.cyclePhase(messageId);
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

	function handleRowCheckboxClick(messageId: string, event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
		const ctrl = event.ctrlKey || event.metaKey;
		const shift = event.shiftKey;
		if (shift || ctrl) {
			setTimeout(() => {
				handleRowSelect(messageId, { shift, ctrl });
			}, 0);
			return;
		}
		mail.toggleMessageSelection(messageId);
	}

	function handleRowLinkClick(messageId: string, event: MouseEvent) {
		if (mail.hasSelection) {
			event.preventDefault();
			if (event.shiftKey || event.metaKey || event.ctrlKey) {
				handleRowSelect(messageId, {
					shift: event.shiftKey,
					ctrl: event.metaKey || event.ctrlKey
				});
			} else {
				mail.toggleMessageSelection(messageId);
			}
			return;
		}
		if (Date.now() < suppressRowNavigationUntil) {
			event.preventDefault();
		}
	}

	function folderSectionCollapsedByDefault(folder: Mailbox): boolean {
		// The open folder should list messages immediately.
		if (mailboxRouteId && folder.id === mailboxRouteId) return false;
		// Important is a main-list section on inbox home.
		if (isInboxHome && folder.role === 'important') return false;
		// Other folders on inbox home stay collapsed until expanded.
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

	function folderSectionSortOrder(folder: Mailbox): number {
		return FOLDER_SECTION_SORT_BASE + mailboxKindOrderForMailbox(folder);
	}

	function mergeMessagePreviews(
		primary: MessagePreview[],
		secondary: MessagePreview[]
	): MessagePreview[] {
		const seen = new Set<string>();
		const merged: MessagePreview[] = [];
		for (const message of [...primary, ...secondary]) {
			if (seen.has(message.id)) continue;
			seen.add(message.id);
			merged.push(message);
		}
		return merged.sort(
			(a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
		);
	}

	function listMessagePreview(message: MessagePreview): MessagePreview {
		return mail.messages.find((entry) => entry.id === message.id) ?? message;
	}



	function isMe(email: string): boolean {
		const cleanEmail = email?.trim().toLowerCase();
		if (!cleanEmail) return false;
		if (auth.username?.trim().toLowerCase() === cleanEmail) return true;
		return auth.identities.some((identity) => identity.email?.trim().toLowerCase() === cleanEmail);
	}

	function simpleSenderLabel(message: MessagePreview, folderRouteId: string): string {
		const threadMessages = messagesByThreadId.get(message.threadId) ?? [message];
		return listThreadSenderLabel(
			threadMessages,
			folderRouteId,
			isMe,
			settings.showSenderEmailInList
		);
	}



	function isNewUnreadListRow(message: MessagePreview): boolean {
		const thread = messagesByThreadId.get(message.threadId) ?? [message];
		return thread.some((entry) => isNewUnreadMessage(entry));
	}

	function isNewUnreadMessage(message: MessagePreview): boolean {
		return message.unread;
	}

	const newUnreadMessages = $derived.by(() =>
		listMessages.filter((message) => isNewUnreadListRow(message))
	);
	const readMessages = $derived.by(() =>
		listMessages.filter((message) => !isNewUnreadListRow(message))
	);
	function messageEligibleForImportantSection(message: MessagePreview): boolean {
		const role = mail.mailboxByRouteId(message.mailboxId)?.role;
		return !isExcludedFromImportantSection(role);
	}

	function showImportantPresentation(message: MessagePreview, routeId: string): boolean {
		if (!message.important) return false;
		const viewRole = mail.mailboxByRouteId(routeId)?.role;
		return shouldPresentImportantColors(viewRole, settings.showImportantColors);
	}

	function canPickImportantRainbow(routeId: string): boolean {
		return canMarkImportantFromMailboxRole(mail.mailboxByRouteId(routeId)?.role);
	}

	const defaultReadSectionVisible = $derived(
		inboxNormalSectionDefaultVisible(
			newUnreadMessages.length,
			0,
			INBOX_SECTION_PAGE_SIZE
		)
	);

	const orderedFolders = $derived.by(() =>
		mail.mailboxes
			.filter(
				(folder) =>
					(folder.total > 0 ||
						(sectionMessagesByFolder[folder.id]?.length ?? 0) > 0 ||
						sectionHasMoreByFolder[folder.id]) &&
					folder.id !== 'unread' &&
					folder.id !== 'read' &&
					(!mailboxRouteId || folder.id !== mailboxRouteId)
			)
			.sort((a, b) => {
				const aRank = mailboxKindOrderForMailbox(a);
				const bRank = mailboxKindOrderForMailbox(b);
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

			if (readMessages.length > 0) {
				sections.push({
					id: READ_SECTION_ID,
					name: 'Normal',
					routeId: mailboxRouteId ?? 'inbox',
					messages: readMessages.slice(
						0,
						sectionVisibleCounts[READ_SECTION_ID] ?? defaultReadSectionVisible
					),
					totalCount: readMessages.length,
					sortOrder: 1,
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
				name: mailbox?.name ?? mailboxName,
				routeId: mailboxRouteId,
				messages: collapseMessagesByThread(messages).slice(0, limit),
				totalCount: mailbox?.total ?? listMessages.length,
				sortOrder: 0,
				showUnreadDot: (mailbox?.unread ?? 0) > 0
			});
		}

		return sections.sort(
			(a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
		);
	});

	let sectionLayoutKey = $state<string | null>(null);

	$effect(() => {
		const layoutKey = `${sectionMode}:${mailboxRouteId ?? ''}:${isInboxHome ? 'home' : 'folder'}`;
		if (layoutKey === sectionLayoutKey) return;
		sectionLayoutKey = layoutKey;

		const counts: Record<string, number> = {
			[NEW_SECTION_ID]: INBOX_SECTION_PAGE_SIZE,
			[IMPORTANT_SECTION_ID]: INBOX_SECTION_PAGE_SIZE,
			[READ_SECTION_ID]: defaultReadSectionVisible
		};
		if (mailboxRouteId && mailboxRouteId !== 'inbox') {
			const mailbox = mail.mailboxByRouteId(mailboxRouteId);
			counts[mailboxRouteId] = defaultSectionVisibleCount(mailboxRouteId, mailbox);
		}
		sectionVisibleCounts = counts;
	});

	$effect(() => {
		if (!isInboxHome) return;

		const folders = orderedFolders;
		let changed = false;
		const next = { ...sectionVisibleCounts };
		for (const folder of folders) {
			if (next[folder.id] === undefined) {
				next[folder.id] = defaultSectionVisibleCount(folder.id, folder);
				changed = true;
			}
		}
		if (changed) sectionVisibleCounts = next;
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
			return [cached.slice(0, limit), cached.length > limit || folder.total > limit];
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

	const folderPreloadKey = $derived.by(() => {
		if (!isInboxHome) return '';
		const parts: string[] = [];
		for (const folder of orderedFolders) {
			const visible =
				sectionVisibleCounts[folder.id] ??
				(folderSectionCollapsedByDefault(folder) ? 0 : FOLDER_SECTION_PAGE_SIZE);
			parts.push(`${folder.id}:${visible}`);
		}
		return parts.join('|');
	});

	$effect(() => {
		const client = auth.client;
		const routeId = mailboxRouteId;
		const useSectionMode = sectionMode;
		const inboxHome = isInboxHome;
		const preloadKey = folderPreloadKey;

		if (!useSectionMode || !client || !routeId || !inboxHome) {
			return;
		}

		// Read orderedFolders WITHOUT tracking it. This effect writes
		// sectionMessagesByFolder/sectionHasMoreByFolder, and orderedFolders is
		// derived from both — tracking it here created an infinite load loop
		// (write → orderedFolders re-derives → effect re-runs → write → …) that
		// froze the tab on accounts with populated folders/Important messages.
		// folderPreloadKey (a value-stable string) remains the real trigger and
		// already captures genuine folder/visible-count changes.
		const folders = untrack(() => orderedFolders);
		const foldersToLoad = folders;
		if (foldersToLoad.length === 0) {
			return;
		}

		let cancelled = false;
		const accountId = client.getAccountId();

		void Promise.all(
			foldersToLoad.map(async (folder) => {
				const sectionId = folder.id;
				const requested =
					sectionVisibleCounts[sectionId] ??
					(folderSectionCollapsedByDefault(folder) ? 0 : FOLDER_SECTION_PAGE_SIZE);
				if (requested === 0) {
					return [sectionId, [] as MessagePreview[], folder.total > 0] as const;
				}
				if (folder.id === routeId) {
					return [
						sectionId,
						messages.slice(0, requested),
						messages.length > requested
					] as const;
				}
				const [previews, hasMoreFolder] = await loadOtherFolderPreviews(
					client,
					accountId,
					folder,
					requested
				);
				return [sectionId, previews, hasMoreFolder] as const;
			})
		).then((entries) => {
			if (cancelled) return;
			sectionMessagesByFolder = {
				...sectionMessagesByFolder,
				...Object.fromEntries(entries.map(([id, cached]) => [id, cached]))
			};
			sectionHasMoreByFolder = {
				...sectionHasMoreByFolder,
				...Object.fromEntries(entries.map(([id, _, hasMoreFolder]) => [id, hasMoreFolder]))
			};
		});

		return () => {
			cancelled = true;
		};
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
		return mailThreadHref(folderId, message.threadId, params);
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

	const flatListDuplicateSubjects = $derived(duplicateSubjectKeys(listMessages));

	function sectionCanShowMore(sectionId: string): boolean {
		const visible =
			sectionVisibleCounts[sectionId] ??
			(sectionId === READ_SECTION_ID && isInboxHome
				? defaultReadSectionVisible
				: sectionPageSize(sectionId));
		if (sectionId === NEW_SECTION_ID) return newUnreadMessages.length > visible;
		if (sectionId === READ_SECTION_ID) {
			return readMessages.length > visible || hasMore;
		}
		if (!isInboxHome && sectionId === mailboxRouteId) {
			const mailbox = mail.mailboxByRouteId(mailboxRouteId);
			if (visible === 0 && mailbox && folderSectionCollapsedByDefault(mailbox)) {
				return listMessages.length > 0 || hasMore;
			}
			return listMessages.length > visible || hasMore;
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
					? nextVisible >= listMessages.length
					: false);
		if (shouldLoadMore) {
			onLoadMore();
		}
	}
</script>

<section
	class={cn(
		'z-mail-pane-surface flex min-h-0 min-w-0 flex-col overflow-hidden',
		hideOnMobile ? (mail.hasSelection ? 'flex' : 'hidden md:flex') : 'flex'
	)}
	style="view-transition-name: message-list;"
	aria-label="{mailboxName} messages"
>
	{#if mailboxRouteId || !sectionMode}
		{#if showBulkBar && mailboxRouteId}
			<MessageListBulkHeader
				{mailboxRouteId}
				{onBulkAction}
				disabled={loading || !!error || !messages.length}
			/>
		{:else}
			<div class="flex min-h-12 shrink-0 items-center border-b border-border/80 px-4 py-2.5">
				<h2 class="z-type-pane-title">{mailboxName}</h2>
			</div>
		{/if}
	{/if}

	<div class="z-pane-scroll min-h-0 flex-1 overflow-y-auto">
		<div class="z-mail-list-body flex w-full min-w-0 flex-col">

	<div
		class={cn(
			'z-mail-list-flow',
			bulkSelectEnabled && 'z-mail-list-flow--selectable',
			mail.hasSelection && 'z-mail-list--selecting'
		)}
	>
		{#snippet simpleMessageRow(message: MessagePreview, routeId: string)}
			{@const senderLabel = simpleSenderLabel(message, routeId)}
			{@const subjectText = message.subject.trim() || '(no subject)'}
			{@const timeLabel = formatMessageListWhen(
				message.receivedAt,
				false,
				settings.timeFormat
			)}
			{@const isUnread = message.unread}
			{@const subjectImportant = showImportantPresentation(message, routeId)}
			{@const rowSelected = bulkSelectEnabled && selectedIds.includes(message.id)}
			{@const rowHref = listMessageHref(message, routeId)}
			{@const isCurrent = currentMessageId === message.id}
			{@const showColorCycle =
				mobileRowGestures &&
				mail.hasSelection &&
				subjectImportant &&
				canPickImportantRainbow(routeId)}
			{@const swipeLeading = listSwipeLeading(message, routeId)}
			{@const swipeTrailing = listSwipeTrailing(message, routeId)}
			<li
				class="z-mail-list-row list-none"
				data-current={isCurrent ? 'true' : undefined}
				data-selected={rowSelected ? 'true' : undefined}
			>
				{#if showRowCheckbox}
					<input
						type="checkbox"
						class={cn('z-mail-list-row__checkbox', rowSelected && 'z-mail-list-row__checkbox--on')}
						checked={rowSelected}
						aria-checked={rowSelected}
						aria-label={`Select ${subjectText}`}
						onclick={(event) => handleRowCheckboxClick(message.id, event)}
					/>
				{/if}
				{#snippet rowLink()}
					<a
						href={rowHref}
						class={listRowLinkClass(isCurrent)}
						draggable={mobileRowGestures ? 'false' : undefined}
						aria-current={isCurrent ? 'page' : undefined}
						aria-label="{isUnread ? 'Unread. ' : ''}{subjectText} — {senderLabel}, {timeLabel}"
						oncontextmenu={(event) => {
							if (supportsMobileListGestures()) event.preventDefault();
						}}
						onclick={(event) => handleRowLinkClick(message.id, event)}
						onpointerenter={(event) => {
							if (!subjectImportant) return;
							if (!hasPreciseHover()) return;
							importantRainbowHoverId = message.id;
							if (settings.reduceMotion || !canPickImportantRainbow(routeId)) return;
							const subject = event.currentTarget.querySelector(
								'.z-mail-list-subject--important'
							);
							if (subject instanceof HTMLElement) {
								importantRainbow.startHoverSample(subject, message.id);
							}
						}}
						onpointerleave={(event) => {
							if (!subjectImportant) return;
							if (!hasPreciseHover()) return;
							if (canPickImportantRainbow(routeId)) {
								persistImportantRainbowPick(message.id, event.currentTarget, event);
							}
						}}
					>
						<div class="min-w-0 flex-1">
							<div class="flex items-baseline justify-between gap-2">
								<p class={listSenderClass(isUnread)}>{senderLabel}</p>
								{#if showColorCycle}
									<button
										type="button"
										class="z-mail-list-color-cycle"
										style={importantRainbow.cssVars(message.id)}
										aria-label="Change important color"
										onclick={(event) => cycleImportantColor(message.id, event)}
									>
										<Palette class="size-4" aria-hidden="true" />
									</button>
								{:else}
									<time class={listTimeClass} datetime={message.receivedAt}>
										{timeLabel}
									</time>
								{/if}
							</div>
							<p
								class={cn(
									listSubjectClass(isUnread, subjectImportant),
									subjectImportant &&
										importantRainbow.hasPicked(message.id) &&
										'z-mail-list-subject--important-picked'
								)}
								style={subjectImportant ? importantRainbow.cssVars(message.id) : undefined}
							>
								{subjectText}
							</p>
							{#if message.preview.trim()}
								<p class={listPreviewClass}>{message.preview}</p>
							{/if}
						</div>
						{#if message.hasAttachment}
							<Paperclip class="mt-0.5 size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
						{/if}
					</a>
				{/snippet}
				{#if mobileRowGestures}
					<SwipeableListRow
						class="z-mail-list-swipe-row"
						enabled={!mail.hasSelection}
						leading={swipeLeading}
						trailing={swipeTrailing}
						longPressEnabled={bulkSelectEnabled}
						onLongPress={() => handleMobileBulkLongPress(message.id)}
					>
						{@render rowLink()}
					</SwipeableListRow>
				{:else}
					{@render rowLink()}
				{/if}
			</li>
		{/snippet}

		{#if error || showFlatEmpty || (loading && messages.length === 0)}
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
			{#if listMessages.length > 0}
				<ul class="divide-y divide-border">
					{#each listMessages as message (message.id)}
						{@render simpleMessageRow(message, mailboxRouteId ?? message.mailboxId)}
					{/each}
				</ul>
				<MessageListLoadMore {hasMore} {loadingMore} {onLoadMore} />
			{:else}
				<p class="px-4 py-8 text-sm text-fg-muted">{resolvedEmptyMessage}</p>
			{/if}
		{:else}
			<ul class="divide-y divide-border">
				{#each listMessages as message (message.id)}
					{@render simpleMessageRow(message, mailboxRouteId ?? message.mailboxId)}
				{/each}
			</ul>
			<MessageListLoadMore {hasMore} {loadingMore} {onLoadMore} />
		{/if}
	</div>
		</div>
	</div>
</section>
