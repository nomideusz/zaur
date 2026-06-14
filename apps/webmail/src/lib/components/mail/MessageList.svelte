<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { untrack } from 'svelte';
	import MessageListLoadMore from '$lib/components/mail/MessageListLoadMore.svelte';
	import MessageListBulkActionBar from '$lib/components/mail/MessageListBulkActionBar.svelte';
	import MessageListToolbar from '$lib/components/mail/MessageListToolbar.svelte';
	import MessageListStatus from '$lib/components/mail/MessageListStatus.svelte';
	import MessageListSkeleton from '$lib/components/mail/MessageListSkeleton.svelte';
	import Paperclip from '$lib/components/icons/Paperclip.svelte';
	import Reply from '$lib/components/icons/Reply.svelte';
	import ChevronLeft from '$lib/components/icons/ChevronLeft.svelte';
	import Important from '$lib/components/icons/Important.svelte';
	import Inbox from '$lib/components/icons/Inbox.svelte';
	import Mail from '$lib/components/icons/Mail.svelte';
	import MailOpen from '$lib/components/icons/MailOpen.svelte';
	import ShieldAlert from '$lib/components/icons/ShieldAlert.svelte';
	import Trash2 from '$lib/components/icons/Trash2.svelte';
	import RefreshCw from '$lib/components/icons/RefreshCw.svelte';
	import { createPullToRefresh } from '$lib/utils/pull-to-refresh.svelte';
	import { haptic } from '$lib/utils/haptics';
	import { goto } from '$app/navigation';
	import {
		listSwipeContext,
		listSwipeLeadingActions,
		listSwipeTrailingActions,
		type ListSwipeAction
	} from '$lib/mail/list-swipe-actions';
	import SwipeableListRow, {
		type SwipeAction
	} from '$lib/components/ui/SwipeableListRow.svelte';
	import Checkbox from '$lib/components/ui/Checkbox.svelte';
	import type {
		MessageListProps
	} from '$lib/components/mail/message-list-props';
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
	import { shellHeader } from '$lib/stores/shell-header.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import type { Mailbox, MessagePreview } from '$lib/types/mail';
	import { mailThreadHref, mailListHref } from '$lib/mail/routes';
	import { mailboxKindOrderForMailbox } from '$lib/mail/mailboxes';
	import { formatMessageListWhen, simpleMessageDayKey } from '$lib/utils/dates';
	import { cn } from '$lib/utils/cn';
	import { hasPreciseHover, supportsMobileListGestures } from '$lib/utils/pointer-env';
	import {
		importantMarker,
		IMPORTANT_MARKER_HOVER_DELAY_MS,
		shouldCommitImportantMarkerPick
	} from '$lib/mail/important-marker.svelte';
	import { createImportantMarkerTouchPick } from '$lib/mail/important-marker-touch';
	import ImportantSubjectHighlight from '$lib/components/mail/ImportantSubjectHighlight.svelte';
	import { LABEL_SEEN, LABEL_UNSEEN } from '$lib/mail/new-mail';
	import { inboxNormalSectionDefaultVisible, inboxImportantSectionCanShowMore } from '$lib/mail/inbox-list-sections';
	import {
		canMarkImportantFromMailboxRole,
		isExcludedFromImportantSection,
		shouldPresentImportantColors
	} from '$lib/mail/mailboxes';

	const listRowLinkClass = (current: boolean) =>
		cn(
			'group/message z-list-row flex w-full min-w-0 items-start gap-3 px-4 py-2.5 text-left no-underline transition-colors',
			current && 'z-list-row--current'
		);
	const listSenderClass = (unread: boolean) =>
		cn(
			'list-sender min-w-0 truncate',
			unread ? 'font-semibold text-fg' : 'font-medium text-fg-muted'
		);
	const listSubjectClass = (unread: boolean, important = false) =>
		cn(
			'list-subject min-w-0',
			'max-md:line-clamp-2 max-md:overflow-hidden',
			important ? 'md:overflow-visible' : 'md:truncate',
			unread ? 'font-semibold text-fg' : 'font-medium text-fg'
		);

	const listTimeClass = 'list-time shrink-0 tabular-nums text-fg-subtle';

	let {
		messages,
		mailboxName,
		mailboxRouteId,
		unseenOnly = false,
		total,
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
	let importantMarkerHoverId = $state<string | null>(null);
	/** After bulk-select long-press, block the following link navigation. */
	let suppressRowNavigationUntil = 0;
	let rainbowHoverTimeout: ReturnType<typeof setTimeout> | null = null;
	let isSamplingRainbow = $state(false);
	let importantMarkerSampleStartedAt = 0;

	const mobileRowGestures = $derived(supportsMobileListGestures());

	const ptr = createPullToRefresh({
		canPull: () => !!mailboxRouteId && mobileRowGestures && !mail.hasSelection && !!auth.client,
		onRefresh: async () => {
			const client = auth.client;
			if (!client || !mailboxRouteId) return;
			await Promise.all([
				mail.refreshMessages(client, mailboxRouteId),
				mail.refreshMailboxes(client)
			]);
		}
	});
	/* Render the indicator only where the gesture can fire (touch + a mailbox). */
	const ptrActive = $derived(mobileRowGestures && !!mailboxRouteId);

	const listMarkerTouch = createImportantMarkerTouchPick({
		canPick: () => !settings.reduceMotion && !hasPreciseHover(),
		onCommitted: () => {
			suppressRowNavigationUntil = Date.now() + 450;
		}
	});

	$effect(() => {
		void $page.url.pathname;
		importantMarkerHoverId = null;
		listMarkerTouch.onPointerCancel();
		if (rainbowHoverTimeout) {
			clearTimeout(rainbowHoverTimeout);
			rainbowHoverTimeout = null;
		}
	});

	function shouldPersistRainbowPick(event: PointerEvent): boolean {
		const row = event.currentTarget;
		if (!(row instanceof HTMLElement) || !row.isConnected) return false;
		const related = event.relatedTarget;
		if (related === null) return false;
		if (related instanceof Node && !document.contains(related)) return false;
		return true;
	}

	function finishImportantMarkerHover(
		messageId: string,
		row: HTMLElement,
		routeId: string,
		commitPick: boolean
	) {
		if (isSamplingRainbow) {
			isSamplingRainbow = false;
			importantMarker.stopHoverSample(messageId);
			if (
				commitPick &&
				canPickImportantRainbow(routeId) &&
				shouldCommitImportantMarkerPick(importantMarkerSampleStartedAt)
			) {
				importantMarker.pickFromRow(row, messageId);
			} else {
				importantMarker.resetFromRow(row, messageId);
			}
		}
		importantMarkerHoverId = null;
		importantMarkerSampleStartedAt = 0;
	}

	function handleRainbowPointerEnter(messageId: string, currentTarget: HTMLElement) {
		if (settings.reduceMotion || !hasPreciseHover()) return;
		if (rainbowHoverTimeout) clearTimeout(rainbowHoverTimeout);
		isSamplingRainbow = false;
		importantMarkerSampleStartedAt = 0;

		rainbowHoverTimeout = setTimeout(() => {
			if (!currentTarget.isConnected) return;
			const subject = currentTarget.querySelector('[data-important-subject]');
			if (subject instanceof HTMLElement) {
				isSamplingRainbow = true;
				importantMarkerHoverId = messageId;
				importantMarkerSampleStartedAt = Date.now();
				importantMarker.startHoverSample(subject, messageId);
			}
		}, IMPORTANT_MARKER_HOVER_DELAY_MS);
	}

	function handleRainbowPointerLeave(messageId: string, currentTarget: HTMLElement, event: PointerEvent, routeId: string) {
		if (rainbowHoverTimeout) {
			clearTimeout(rainbowHoverTimeout);
			rainbowHoverTimeout = null;
		}

		if (isSamplingRainbow) {
			if (!shouldPersistRainbowPick(event)) {
				finishImportantMarkerHover(messageId, currentTarget, routeId, false);
				return;
			}
			finishImportantMarkerHover(messageId, currentTarget, routeId, true);
			return;
		}

		const subject = currentTarget.querySelector('[data-important-subject]');
		if (subject instanceof HTMLElement) {
			importantMarker.resetFromElement(subject, messageId);
		}
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
	/** The Unseen filter flattens the home view to a single filtered section. */
	const isInboxHome = $derived(sectionMode && mailboxRouteId === 'inbox' && !unseenOnly);
	const resolvedEmptyMessage = $derived(emptyMessage ?? defaultEmptyMessage(mailboxRouteId));
	const resolvedEmptyHint = $derived(
		emptyHint ?? (emptyMessage ? null : defaultEmptyHint(mailboxRouteId))
	);
	const showFlatEmpty = $derived(!loading && !error && messages.length === 0);
	const selectedIds = $derived([...mail.selectedMessageIds]);
	const allVisibleSelected = $derived(
		listMessages.length > 0 &&
			listMessages.every((message) => selectedIds.includes(message.id))
	);
	const bulkSelectEnabled = $derived(!!mailboxRouteId);
	const bulkSelectionMessages = $derived(listMessages);

	const listToolbarDisabled = $derived(loading || !!error || !messages.length);

	$effect(() => {
		// The list pane keeps its filter toolbar while a thread is open in the reader, so this
		// is gated on having a mailbox (not on sectionMode, which drops out once a thread opens).
		if (!mailboxRouteId || mail.hasSelection) {
			shellHeader.clearMailListToolbar();
			return;
		}

		const generation = shellHeader.setMailListToolbar({
			mailboxRouteId,
			disabled: listToolbarDisabled
		});
		return () => shellHeader.clearMailListToolbar(generation);
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
	/** Desktop: reserve checkbox column (revealed on hover). Mobile: only while selecting (enter via long-press). */
	const listSelectMode = $derived(
		bulkSelectEnabled && (!mobileRowGestures || mail.hasSelection)
	);
	const showRowCheckbox = $derived(listSelectMode);

	function handleMobileBulkLongPress(message: MessagePreview) {
		/* Already selecting: long-press joins the selection instead of restarting it. */
		if (mail.hasSelection) {
			mail.toggleMessageSelection(message.id);
		} else {
			mail.startSelection(message.id);
		}
		suppressRowNavigationUntil = Date.now() + 400;
	}

	function isImportantSubjectTouchTarget(event: PointerEvent): boolean {
		const target = event.target;
		return target instanceof Element && target.closest('.z-important-subject-touch') !== null;
	}

	function swipeContext(message: MessagePreview, routeId: string) {
		const mailbox = mail.mailboxByRouteId(routeId);
		const role = mailbox?.role;
		return listSwipeContext(message, mailbox, {
			canMarkImportant: mail.canMarkImportantInMailbox(mailbox),
			canMarkSpam:
				mail.mailboxes.some((mb) => mb.role === 'junk') &&
				role !== 'junk' &&
				role !== 'trash' &&
				role !== 'drafts' &&
				role !== 'sent',
			hasInbox: mail.mailboxes.some((mb) => mb.role === 'inbox' && mb.jmapId)
		});
	}

	const SWIPE_ACTION_ICONS: Record<string, SwipeAction['icon']> = {
		'mark-seen': MailOpen,
		unsee: Mail,
		'mark-important': Important,
		'remove-important': Important,
		'move-inbox': Inbox,
		spam: ShieldAlert,
		trash: Trash2,
		'delete-forever': Trash2,
		'delete-draft': Trash2
	};

	function toSwipeActions(
		actions: ListSwipeAction[],
		message: MessagePreview,
		routeId: string
	): SwipeAction[] {
		return actions.map((action) => ({
			id: action.id,
			label: action.label,
			variant: action.variant,
			dismiss: action.dismiss,
			icon: SWIPE_ACTION_ICONS[action.id],
			onAction: () => runSwipeAction(action.id, message, routeId)
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

	/** Returns false on cancel/failure so dismissed rows slide back into place. */
	async function runSwipeAction(
		actionId: string,
		message: MessagePreview,
		routeId: string
	): Promise<boolean> {
		if (!auth.client) return false;

		switch (actionId) {
			case 'move-inbox':
				return swipeMoveToInbox(message);
			case 'mark-important':
			case 'remove-important':
				return swipeToggleImportant(message);
			case 'mark-seen':
				return swipeMutate(() => mail.markMessageDone(auth.client!, message), 'Could not mark seen');
			case 'unsee':
				return swipeMutate(() => mail.markMessageNew(auth.client!, message), 'Could not restore Unseen');
			case 'spam':
				return swipeMarkSpam(message);
			case 'trash':
			case 'delete-forever':
			case 'delete-draft':
				return swipeDeleteMessage(message, routeId);
		}
		return false;
	}

	async function swipeMutate(action: () => Promise<unknown>, failText: string): Promise<boolean> {
		try {
			await action();
			onBulkAction?.();
			return true;
		} catch (err) {
			const text = err instanceof Error ? err.message : failText;
			toast.show(text, 'error');
			return false;
		}
	}

	function swipeMoveToInbox(message: MessagePreview): Promise<boolean> {
		return swipeMutate(() => mail.moveMessage(auth.client!, message, 'inbox'), 'Move failed');
	}

	function swipeToggleImportant(message: MessagePreview): Promise<boolean> {
		return swipeMutate(
			() => mail.toggleImportant(auth.client!, message),
			'Could not update highlight'
		);
	}

	function swipeMarkSpam(message: MessagePreview): Promise<boolean> {
		return swipeMutate(async () => {
			await mail.moveMessage(auth.client!, message, 'junk');
			toast.show('Moved to Spam', 'success');
		}, 'Could not move to Spam');
	}

	async function swipeDeleteMessage(message: MessagePreview, routeId: string): Promise<boolean> {
		if (!auth.client) return false;
		const mailbox = mail.mailboxByRouteId(routeId);
		const permanent = mailbox?.role === 'trash' || mailbox?.role === 'drafts';
		if (!(await settings.confirmDeleteMessage(1, permanent))) return false;
		return swipeMutate(() => mail.deleteMessage(auth.client!, message, routeId), 'Delete failed');
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

	function handleRowCheckboxChange(messageId: string) {
		if (mobileRowGestures) haptic(8);
		mail.toggleMessageSelection(messageId);
	}

	function handleRowCheckboxClick(messageId: string, event: MouseEvent) {
		event.stopPropagation();
		const ctrl = event.ctrlKey || event.metaKey;
		const shift = event.shiftKey;
		if (!shift && !ctrl) return;
		event.preventDefault();
		setTimeout(() => {
			handleRowSelect(messageId, { shift, ctrl });
		}, 0);
	}

	function handleRowLinkClick(messageId: string, event: MouseEvent) {
		if (mail.hasSelection) {
			event.preventDefault();
			if (mobileRowGestures) haptic(8);
			if (event.shiftKey || event.metaKey || event.ctrlKey) {
				handleRowSelect(messageId, {
					shift: event.shiftKey,
					ctrl: event.metaKey || event.ctrlKey
				});
			} else if (allVisibleSelected) {
				mail.clearSelection();
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
		if (!message.important || !canPickImportantRainbow(routeId)) return false;
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
					name: LABEL_UNSEEN,
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
			const collapsed =
				!unseenOnly && mailbox ? folderSectionCollapsedByDefault(mailbox) : false;
			const limit =
				sectionVisibleCounts[mailboxRouteId] ?? (collapsed ? 0 : INBOX_SECTION_PAGE_SIZE);
			sections.push({
				id: mailboxRouteId,
				name: unseenOnly ? LABEL_UNSEEN : (mailbox?.name ?? mailboxName),
				routeId: mailboxRouteId,
				messages: collapseMessagesByThread(messages).slice(0, limit),
				totalCount: unseenOnly
					? (total ?? listMessages.length)
					: (mailbox?.total ?? listMessages.length),
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
		<header
			class="z-mail-list-pane-header hidden h-14 w-full shrink-0 items-center overflow-hidden border-b border-border/80 bg-surface md:flex"
		>
			{#if mailboxRouteId}
				<MessageListToolbar
					class="w-full min-w-0"
					disabled={listToolbarDisabled}
				/>
			{:else}
				<h2 class="z-type-pane-title min-w-0 truncate px-4">{mailboxName}</h2>
			{/if}
		</header>
	{/if}

	{#snippet listScroll()}
		<div
			class={cn('z-pane-scroll min-h-0 flex-1 overflow-y-auto flex flex-col', ptrActive && 'z-pane-scroll--ptr')}
			use:ptr.attach
		>
			{#if ptrActive}
				<div
					class={cn(
						'z-ptr',
						ptr.armed && 'z-ptr--armed',
						ptr.refreshing && 'z-ptr--refreshing',
						ptr.releasing && 'z-ptr-animating'
					)}
					style="transform: translateY({ptr.pull - 52}px); opacity: {ptr.refreshing ? 1 : ptr.progress};"
					aria-hidden="true"
				>
					<span class="z-ptr__spinner">
						{#if ptr.refreshing}
							<span class="z-spinner size-[1.05rem]" aria-hidden="true">
								<RefreshCw class="size-full" />
							</span>
						{:else}
							<span class="z-ptr__icon" style="transform: rotate({ptr.progress * 280}deg);">
								<RefreshCw class="size-[1.05rem]" />
							</span>
						{/if}
					</span>
				</div>
			{/if}
			<div
				class={cn('z-mail-list-body flex-1 flex w-full min-w-0 flex-col min-h-full', ptr.releasing && 'z-ptr-animating')}
				style={ptrActive && (ptr.pull > 0 || ptr.refreshing || ptr.releasing)
					? `transform: translateY(${ptr.pull}px);`
					: undefined}
			>
	<div
		class={cn(
			'z-mail-list-flow flex-1 flex flex-col min-h-full',
			listSelectMode && 'z-mail-list-flow--selectable',
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
			{@const swipeLeading = listSwipeLeading(message, routeId)}
			{@const swipeTrailing = listSwipeTrailing(message, routeId)}
			<li
				class="z-mail-list-row list-none"
				data-message-id={message.id}
				data-current={isCurrent ? 'true' : undefined}
				data-selected={rowSelected ? 'true' : undefined}
				data-unread={isUnread ? 'true' : undefined}
			>
				{#if showRowCheckbox}
					<div class="z-mail-list-checkbox-col z-mail-list-checkbox-col--row">
						<Checkbox
							class={cn('z-mail-list-row__checkbox absolute m-0', rowSelected && 'z-mail-list-row__checkbox--on')}
							checked={rowSelected}
							label={`Select ${subjectText}`}
							onchange={() => handleRowCheckboxChange(message.id)}
							onclick={(event) => handleRowCheckboxClick(message.id, event)}
						/>
					</div>
				{/if}
				{#snippet rowLink()}
					<a
						href={rowHref}
						class={listRowLinkClass(isCurrent)}
						data-hide-active-indicator
						draggable={mobileRowGestures ? 'false' : undefined}
						aria-current={isCurrent ? 'page' : undefined}
						aria-label="{isUnread ? `${LABEL_UNSEEN}. ` : ''}{subjectText} — {senderLabel}, {timeLabel}"
						oncontextmenu={(event) => {
							if (supportsMobileListGestures()) event.preventDefault();
						}}
						onclick={(event) => handleRowLinkClick(message.id, event)}
						onpointerenter={(event) => {
							if (!subjectImportant) return;
							handleRainbowPointerEnter(message.id, event.currentTarget);
						}}
						onpointerleave={(event) => {
							if (!subjectImportant) return;
							handleRainbowPointerLeave(message.id, event.currentTarget, event, routeId);
						}}
					>
						<div class="z-mail-list-row-copy min-w-0 flex-1">
							<p class={listSenderClass(isUnread)}>{#if isUnread}<span class="z-mail-list-unread-dot" aria-hidden="true"></span>{/if}{senderLabel}</p>
							<p
								class={cn(
									listSubjectClass(isUnread, subjectImportant),
									subjectImportant &&
										mobileRowGestures &&
										canPickImportantRainbow(routeId) &&
										'z-important-subject-touch'
								)}
								onpointerdowncapture={(event) => {
									if (!subjectImportant || !canPickImportantRainbow(routeId)) return;
									event.stopPropagation();
								}}
								onpointerdown={(event) => {
									if (!subjectImportant || !canPickImportantRainbow(routeId)) return;
									event.stopPropagation();
									listMarkerTouch.onPointerDown(message.id, event);
								}}
								onpointermove={listMarkerTouch.onPointerMove}
								onpointerup={(event) => {
									if (!subjectImportant || !canPickImportantRainbow(routeId)) return;
									listMarkerTouch.onPointerUp(message.id, event);
								}}
								onpointercancel={listMarkerTouch.onPointerCancel}
							>
								{#if subjectImportant}
									{#key importantMarker.highlightInstanceKey(message.id)}
										<ImportantSubjectHighlight
											messageId={message.id}
											instanceKey={importantMarker.highlightInstanceKey(message.id)}
											surface="list"
										>
											{subjectText}
										</ImportantSubjectHighlight>
									{/key}
								{:else}
									{subjectText}
								{/if}
							</p>
							<time class={listTimeClass} datetime={message.receivedAt}>
								{timeLabel}
							</time>
						</div>
						{#if message.hasAttachment || message.replied}
							<div class="flex items-center gap-1 shrink-0 text-fg-subtle">
								{#if message.replied}
									<Reply class="mt-0.5 size-4" aria-hidden="true" />
								{/if}
								{#if message.hasAttachment}
									<Paperclip class="mt-0.5 size-4" aria-hidden="true" />
								{/if}
							</div>
						{/if}
					</a>
				{/snippet}
				{#if mobileRowGestures}
					<SwipeableListRow
						class="z-mail-list-swipe-row"
						enabled={!mail.hasSelection}
						leading={swipeLeading}
						trailing={swipeTrailing}
						springSnap={!settings.reduceMotion}
						longPressEnabled={bulkSelectEnabled}
						longPressExempt={isImportantSubjectTouchTarget}
						onLongPress={() => handleMobileBulkLongPress(message)}
					>
						{@render rowLink()}
					</SwipeableListRow>
				{:else}
					{@render rowLink()}
				{/if}
			</li>
		{/snippet}

		{#if loading && messages.length === 0}
			<MessageListSkeleton />
		{:else if error || showFlatEmpty}
			<MessageListStatus
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
		{:else if listMessages.length > 0}
			<ul class="z-mail-list-cards">
				{#each listMessages as message (message.id)}
					{@render simpleMessageRow(message, mailboxRouteId ?? message.mailboxId)}
				{/each}
			</ul>
			<MessageListLoadMore {hasMore} {loadingMore} {onLoadMore} />
		{:else if sectionMode}
			<p class="px-4 py-8 text-sm text-fg-muted">{resolvedEmptyMessage}</p>
		{/if}
	</div>
			</div>
		</div>
	{/snippet}

	{#if mailboxRouteId}
		<MessageListBulkActionBar
			{mailboxRouteId}
			{onBulkAction}
			disabled={listToolbarDisabled}
		>
			{#snippet children()}
				{@render listScroll()}
			{/snippet}
		</MessageListBulkActionBar>
	{:else}
		{@render listScroll()}
	{/if}
</section>
