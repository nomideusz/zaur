<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { untrack } from 'svelte';
	import MessageListLoadMore from '$lib/components/mail/MessageListLoadMore.svelte';
	import MessageListMobileBar from '$lib/components/mail/MessageListMobileBar.svelte';
	import MessageListStatus from '$lib/components/mail/MessageListStatus.svelte';
	import DinoZaur from '$lib/components/mail/DinoZaur.svelte';
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
	import MailTextNav from '$lib/components/mail/MailTextNav.svelte';
	import { contentPagePadClass } from '$lib/mail/layout';
	import { mailListHref, mailThreadHref } from '$lib/mail/routes';
	import { mailboxKindOrderForMailbox } from '$lib/mail/mailboxes';
	import {
		formatSimpleListWhen,
		simpleMessageDayKey,
		formatSimpleListTime,
		formatSimpleListDayHeading
	} from '$lib/utils/dates';
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

	/** Editorial list row — shared Tailwind building blocks. */
	const listMessageGroup = 'group/message';
	const listMessageLinkClass = cn(listMessageGroup, 'block min-w-0 no-underline');
	const listMessageRowClass = 'z-mail-list-row';
	const listMessageStackClass = 'flex min-w-0 flex-row items-start justify-between gap-4';
	const listMessageLeadClass = 'flex min-w-0 flex-1 flex-col gap-0.5';
	const listSubjectShellClass =
		'list-subject block min-w-0 w-full z-type-page leading-[1.4] break-words';
	const listSubjectPlainClass = (isNew: boolean) =>
		cn(
			listSubjectShellClass,
			'font-normal underline underline-offset-[0.2em] decoration-1',
			'transition-[color,text-decoration-color] duration-150',
			isNew
				? 'z-mail-list-subject--new'
				: cn(
						'text-fg decoration-fg/35',
						'group-hover/message:decoration-fg/55 group-focus-visible/message:decoration-fg/55'
					)
		);
	const listImportantSubjectClass = 'z-mail-list-subject--important';
	const listRowMetaClass = (isNew: boolean) =>
		cn(
			'shrink-0 tabular-nums no-underline text-xs leading-[1.4] z-mail-list-row-meta',
			isNew
				? 'z-mail-list-meta--new'
				: cn(
						'text-fg-muted',
						'group-hover/message:text-fg group-focus-visible/message:text-fg'
					)
		);
	const listSenderClass = (visible: boolean, isNew: boolean) =>
		cn(
			'z-type-page leading-[1.4]',
			isNew ? 'font-semibold text-fg' : 'font-medium text-fg-muted',
			visible ? 'block' : 'hidden'
		);
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
	const bulkSelectEnabled = $derived(!!mailboxRouteId);
	function flattenSectionsForSelection(
		sections: { messages: MessagePreview[] }[]
	): MessagePreview[] {
		const seen = new Set<string>();
		const flattened: MessagePreview[] = [];
		for (const section of sections) {
			for (const message of section.messages) {
				if (seen.has(message.id)) continue;
				seen.add(message.id);
				flattened.push(message);
			}
		}
		return flattened;
	}

	const bulkSelectionMessages = $derived.by(() => {
		if (!sectionMode) return listMessages;
		return flattenSectionsForSelection(folderSections);
	});

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
		event.stopPropagation();
		const ctrl = event.ctrlKey || event.metaKey;
		const shift = event.shiftKey;
		if (shift || ctrl) {
			event.preventDefault();
			setTimeout(() => {
				handleRowSelect(messageId, { shift, ctrl });
			}, 0);
		}
	}

	function handleRowCheckboxChange(messageId: string, event: Event) {
		event.stopPropagation();
		const input = event.currentTarget as HTMLInputElement;
		const isSelected = mail.selectedMessageIds.has(messageId);
		if (input.checked === isSelected) return;
		mail.toggleMessageSelection(messageId);
		if (!input.checked) input.blur();
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
		'z-mail-pane-surface z-mail-pane-surface--flow flex w-full min-w-0 flex-col',
		hideOnMobile ? (mail.hasSelection ? 'flex' : 'hidden md:flex') : 'flex'
	)}
	style="view-transition-name: message-list;"
	aria-label="{mailboxName} messages"
>
	<div
		class={cn(
			contentPagePadClass(),
			'flex flex-col'
		)}
	>
	{#if mailboxRouteId || !sectionMode}
		{#if showBulkBar && mailboxRouteId}
			<MessageListMobileBar
				mailboxRouteId={mailboxRouteId}
				showNavLinks={!isInboxHome}
				{onBulkAction}
				disabled={loading || !!error || !messages.length}
			/>
		{:else}
			<MailTextNav
				title={isInboxHome ? appConfig.brandName : mailboxName}
				titleHref={isInboxHome ? mailHomeHref : null}
				actionHref="/mail/compose"
				actionLabel="New message"
				showBackToMail={!isInboxHome}
				backHref={mailHomeHref}
				showSettings={false}
			/>
		{/if}
	{/if}

	<div
		class={cn(
			'z-mail-list-flow',
			bulkSelectEnabled && 'z-mail-list-flow--selectable',
			mail.hasSelection && 'z-mail-list--selecting'
		)}
	>
		{#snippet simpleMessageRow(
			message: MessagePreview,
			routeId: string,
			index: number,
			messagesList: MessagePreview[],
			duplicateKeys: Set<string> = flatListDuplicateSubjects,
			listSectionId?: string
		)}
			{@const isNewDay = listRowStartsNewDay(messagesList, index)}
			{@const senderLabel = simpleSenderLabel(message, routeId)}
			{@const subjectText = message.subject.trim() || '(no subject)'}
			{@const baseTimeLabel = formatSimpleListTime(message.receivedAt, settings.timeFormat)}
			{@const timeLabel = isNewDay
				? `${formatSimpleListDayHeading(message.receivedAt)} ${baseTimeLabel}`
				: baseTimeLabel}
			{@const showSender = true}
			{@const isNewRow = isNewUnreadListRow(message)}
			{@const showNewDot = isInboxHome && isNewRow}
			{@const rowSelected = bulkSelectEnabled && selectedIds.includes(message.id)}
			{@const rowHref = listMessageHref(message, routeId)}
			{@const showColorCycle =
				mobileRowGestures &&
				mail.hasSelection &&
				showImportantPresentation(message, routeId) &&
				canPickImportantRainbow(routeId)}
			{@const swipeLeading = listSwipeLeading(message, routeId)}
			{@const swipeTrailing = listSwipeTrailing(message, routeId)}
			<li
				class={cn('list-none', listMessageRowClass, rowSelected && !message.important && '[&_.list-subject]:text-accent')}
				data-current={currentMessageId === message.id ? 'true' : undefined}
				data-new={isNewRow ? 'true' : undefined}
				data-selected={rowSelected ? 'true' : undefined}
			>
				{#if showRowCheckbox}
					<input
						type="checkbox"
						class="z-mail-list-row__checkbox"
						checked={rowSelected}
						aria-label={`Select ${subjectText}`}
						onclick={(event) => handleRowCheckboxClick(message.id, event)}
						onchange={(event) => handleRowCheckboxChange(message.id, event)}
					/>
				{/if}
				{#snippet rowLink()}
					<a
						href={rowHref}
						class={listMessageLinkClass}
						draggable={mobileRowGestures ? 'false' : undefined}
						aria-current={currentMessageId === message.id ? 'page' : undefined}
						aria-label="{showNewDot ? 'New. ' : ''}{subjectText} — {senderLabel}, {timeLabel}"
						oncontextmenu={(event) => {
							if (supportsMobileListGestures()) event.preventDefault();
						}}
						onclick={(event) => handleRowLinkClick(message.id, event)}
						onpointerenter={(event) => {
							if (!showImportantPresentation(message, routeId)) return;
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
							if (!showImportantPresentation(message, routeId)) return;
							if (!hasPreciseHover()) return;
							if (canPickImportantRainbow(routeId)) {
								persistImportantRainbowPick(message.id, event.currentTarget, event);
							}
						}}
					>
						<span class={listMessageStackClass}>
							<span class={listMessageLeadClass}>
								<span class={listSenderClass(showSender, isNewRow)}>{senderLabel}</span>
								<span class="flex min-w-0 w-full items-start gap-2">
									{#if showImportantPresentation(message, routeId)}
										<span
											class={cn(
												listSubjectShellClass,
												listImportantSubjectClass,
												importantRainbow.hasPicked(message.id) &&
													'z-mail-list-subject--important-picked'
											)}
											style={importantRainbow.cssVars(message.id)}
										>{subjectText}</span>
									{:else}
										<span class={listSubjectPlainClass(isNewRow)}>{subjectText}</span>
									{/if}
								</span>
							</span>
							<span class={listRowMetaClass(isNewRow)}>
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
									<time class="z-mail-list-row-meta__time" datetime={message.receivedAt}>
										{timeLabel}
									</time>
								{/if}
							</span>
						</span>
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
			<div class="z-mail-list-sections">
				{#if isInboxHome}
					{@const visibleNew = newUnreadMessages.slice(0, sectionVisibleCounts[NEW_SECTION_ID] ?? INBOX_SECTION_PAGE_SIZE)}
					{@const visibleRead = readMessages.slice(0, sectionVisibleCounts[READ_SECTION_ID] ?? defaultReadSectionVisible)}
					{@const newDuplicateSubjects = duplicateSubjectKeys(visibleNew)}
					{@const readDuplicateSubjects = duplicateSubjectKeys(visibleRead)}
					{#if visibleNew.length > 0 || visibleRead.length > 0}
						<ul class="z-mail-list-section-messages z-mail-list-section-messages--combined">
							{#each visibleNew as message, index (message.id)}
								{@render simpleMessageRow(message, mailboxRouteId ?? 'inbox', index, visibleNew, newDuplicateSubjects, NEW_SECTION_ID)}
							{/each}
							{#if sectionCanShowMore(NEW_SECTION_ID)}
								<li class="z-mail-list-section-more-row">
									<button type="button" class={listMoreClass} onclick={() => revealMoreInSection(NEW_SECTION_ID)}>
										{sectionRevealLabel(NEW_SECTION_ID, newUnreadMessages.length)}
									</button>
								</li>
							{/if}
							{#if visibleNew.length > 0 && visibleRead.length > 0}
								<li class="z-mail-list-squiggly-divider" aria-hidden="true">
									<svg xmlns="http://www.w3.org/2000/svg" class="w-full h-3">
										<pattern id="squiggly-pattern" width="12" height="12" patternUnits="userSpaceOnUse">
											<path d="M0,6 Q3,-1 6,6 T12,6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
										</pattern>
										<rect width="100%" height="12" fill="url(#squiggly-pattern)"/>
									</svg>
								</li>
							{/if}
							{#each visibleRead as message, index (message.id)}
								{@render simpleMessageRow(message, mailboxRouteId ?? 'inbox', index, visibleRead, readDuplicateSubjects, READ_SECTION_ID)}
							{/each}
							{#if sectionCanShowMore(READ_SECTION_ID)}
								<li class="z-mail-list-section-more-row">
									<button type="button" class={listMoreClass} onclick={() => revealMoreInSection(READ_SECTION_ID)}>
										{sectionRevealLabel(READ_SECTION_ID, readMessages.length)}
									</button>
								</li>
							{/if}
						</ul>
					{:else}
						<p class="z-type-page leading-[1.55] font-normal text-fg">{resolvedEmptyMessage}</p>
					{/if}
				{:else}
					{#each folderSections as section, sectionIndex (section.id)}
						{@const sectionDuplicateSubjects = duplicateSubjectKeys(section.messages)}
						<section
							style:order={section.sortOrder}
							style:--section-index={sectionIndex}
							aria-label={undefined}
						>
							{#if section.id !== mailboxRouteId}
								<div class="z-mail-list-section-head">
									<p class="z-mail-list-section-title">
										{#if section.showUnreadDot}
											<span
												class="size-[0.4375rem] shrink-0 rounded-full bg-unread"
												aria-hidden="true"
											></span>
										{/if}
										{section.name}
									</p>
									<span class={listSectionCountClass(section.id)}>{section.totalCount}</span>
								</div>
							{/if}
							{#if section.messages.length > 0}
								<ul class="z-mail-list-section-messages">
									{#each section.messages as message, index (message.id)}
										{@render simpleMessageRow(message, section.routeId, index, section.messages, sectionDuplicateSubjects, section.id)}
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
				{/if}

				{#if folderSections.length === 0 && !isInboxHome}
					<p class="z-type-page leading-[1.55] font-normal text-fg">{resolvedEmptyMessage}</p>
				{/if}
			</div>

			{#if isInboxHome && orderedFolders.length > 0 && !showBulkBar}
				<nav
					class="z-mail-list-folders z-type-page-muted flex flex-wrap items-center gap-x-3 gap-y-1 text-fg-muted"
					aria-label="Folders"
				>
					{#each orderedFolders as folder (folder.id)}
						<a
							href={mailListHref(folder.id)}
							class="inline-flex items-baseline gap-1.5 text-fg-muted no-underline transition-colors hover:text-fg"
						>
							<span>{folder.name}</span>
							<span class="z-type-list-count tabular-nums font-semibold">{folder.total}</span>
						</a>
					{/each}
				</nav>
			{/if}
		{:else}
			<ul class="flex flex-col gap-3">
				{#each listMessages as message, index (message.id)}
					{@render simpleMessageRow(message, mailboxRouteId ?? message.mailboxId, index, listMessages)}
				{/each}
			</ul>

			<MessageListLoadMore {hasMore} {loadingMore} {onLoadMore} />
		{/if}
	</div>
	{#if !loading && !error && !mail.hasSelection}
		<DinoZaur />
	{/if}
	{#if !showBulkBar}
	<div class="z-mail-text-nav__links mt-[var(--z-main-gap)]!">
		<a class="z-mail-text-nav__link" href="/calendar">Calendar</a>
		<span class="z-mail-text-nav__sep">·</span>
		<a class="z-mail-text-nav__link" href="/contacts">Contacts</a>
		<span class="z-mail-text-nav__sep">·</span>
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
	{/if}
	</div>
</section>
