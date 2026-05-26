import type { JMAPClient } from '$lib/jmap/client';
import { browser } from '$app/environment';
import { mapEmailDetail, mapEmailPreview } from '$lib/jmap/map';
import type { JMAPEmail, JMAPMailbox } from '$lib/jmap/types';
import { isAccountSettingsSubject } from '$lib/settings/account-settings-types';
import type { Mailbox, MessageDetail, MessagePreview } from '$lib/types/mail';
import { settings } from '$lib/stores/settings.svelte';
import { toast } from '$lib/stores/toast.svelte';
import { applyUnreadPrefixToDocument } from '$lib/utils/document-title';
import { showBrowserNotification } from '$lib/utils/notifications';
import { recordContact, recordContacts } from '$lib/utils/contact-index';

const PAGE_SIZE = 50;

function isVisibleListEmail(email: JMAPEmail): boolean {
	return !isAccountSettingsSubject(email.subject);
}

function mapVisiblePreviews(emails: JMAPEmail[], routeMailboxId: string): MessagePreview[] {
	return emails.filter(isVisibleListEmail).map((email) => mapEmailPreview(email, routeMailboxId));
}

function messagePreviewEqual(a: MessagePreview, b: MessagePreview): boolean {
	return (
		a.id === b.id &&
		a.unread === b.unread &&
		a.starred === b.starred &&
		a.subject === b.subject &&
		a.preview === b.preview &&
		a.receivedAt === b.receivedAt &&
		a.from.name === b.from.name &&
		a.from.email === b.from.email &&
		a.hasAttachment === b.hasAttachment
	);
}

function messagePreviewsEqual(a: MessagePreview[], b: MessagePreview[]): boolean {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		if (!messagePreviewEqual(a[i], b[i])) return false;
	}
	return true;
}

const ROLE_ORDER: Record<string, number> = {
	inbox: 0,
	drafts: 1,
	sent: 2,
	archive: 3,
	junk: 4,
	trash: 5
};

function mapMailbox(mb: JMAPMailbox): Mailbox {
	const role = (mb.role as Mailbox['role'] | null) ?? undefined;
	const routeId = role && role !== 'custom' ? role : mb.id;
	return {
		id: routeId,
		jmapId: mb.id,
		name: mb.name,
		role: role ?? 'custom',
		unread: mb.unreadEmails ?? 0,
		total: mb.totalEmails ?? 0,
		parentId: mb.parentId ?? undefined
	};
}

function sortMailboxes(a: Mailbox, b: Mailbox): number {
	const aRole = a.role ? ROLE_ORDER[a.role] : undefined;
	const bRole = b.role ? ROLE_ORDER[b.role] : undefined;
	if (aRole !== undefined && bRole !== undefined) return aRole - bRole;
	if (aRole !== undefined) return -1;
	if (bRole !== undefined) return 1;
	return a.name.localeCompare(b.name);
}

function indexMessagesContacts(messages: Array<MessagePreview | MessageDetail>) {
	if (!browser || !messages.length) return;

	void import('$lib/db').then(({ getAccountId }) => {
		const accountId = getAccountId();
		if (!accountId) return;

		for (const message of messages) {
			recordContact(accountId, message.from.name, message.from.email);
			if ('to' in message) {
				recordContacts(accountId, message.to);
				recordContacts(accountId, message.cc);
			}
		}
	});
}

class MailStore {
	mailboxes = $state<Mailbox[]>([]);
	mailboxesLoading = $state(false);
	mailboxesError = $state<string | null>(null);

	messages = $state<MessagePreview[]>([]);
	messagesLoading = $state(false);
	messagesLoadingMore = $state(false);
	messagesError = $state<string | null>(null);
	messagesTotal = $state(0);
	messagesHasMore = $state(false);
	messagesFromCache = $state(false);
	currentMailboxRouteId = $state<string | null>(null);
	/** Last mailbox route id whose message list fetch finished (including empty folders). */
	messagesLoadSettledForRouteId = $state<string | null>(null);

	selectedThread = $state<MessageDetail[]>([]);
	selectedThreadId = $state<string | null>(null);
	selectedLoading = $state(false);
	selectedError = $state<string | null>(null);

	selectedMessageIds = $state<Set<string>>(new Set());
	selectionAnchorId = $state<string | null>(null);
	bulkActionLoading = $state(false);

	/** True when one or more list messages are checked. */
	get hasSelection() {
		return this.selectedMessageIds.size > 0;
	}

	/** In-flight keyword changes the server may not have echoed yet. */
	private pendingKeywords = new Map<string, { starred?: boolean; unread?: boolean }>();
	/** Hidden settings-sync emails per mailbox JMAP id (excluded from folder totals). */
	private hiddenSettingsPerMailbox = new Map<string, number>();
	private lastFallbackRefreshAt = 0;

	get selectedCount() {
		return this.selectedMessageIds.size;
	}

	selectedMessages(): MessagePreview[] {
		return this.messages.filter((message) => this.selectedMessageIds.has(message.id));
	}

	async syncHiddenSettingsCounts(client: JMAPClient) {
		try {
			const { getHiddenSettingsCountByMailbox } = await import('$lib/settings/account-settings-email');
			this.hiddenSettingsPerMailbox = await getHiddenSettingsCountByMailbox(client);
		} catch {
			// Non-critical — folder totals may include the hidden settings message
		}
	}

	private visibleMailboxTotal(jmapId: string, rawTotal: number): number {
		return Math.max(0, rawTotal - (this.hiddenSettingsPerMailbox.get(jmapId) ?? 0));
	}

	private decorateMailbox(mb: JMAPMailbox): Mailbox {
		const mapped = mapMailbox(mb);
		mapped.total = this.visibleMailboxTotal(mb.id, mb.totalEmails ?? 0);
		return mapped;
	}

	async loadMailboxes(client: JMAPClient) {
		this.mailboxesLoading = true;
		this.mailboxesError = null;
		try {
			await this.syncHiddenSettingsCounts(client);
			const list = await client.getMailboxes();
			this.mailboxes = list.map((mb) => this.decorateMailbox(mb)).sort(sortMailboxes);
			applyUnreadPrefixToDocument();
		} catch (error) {
			this.mailboxesError = error instanceof Error ? error.message : 'Failed to load folders';
			this.mailboxes = [];
		} finally {
			this.mailboxesLoading = false;
		}
	}

	async loadMessages(client: JMAPClient, routeMailboxId: string, options?: { force?: boolean }) {
		if (
			!options?.force &&
			(this.messagesLoading ||
				(this.messagesLoadSettledForRouteId === routeMailboxId &&
					this.currentMailboxRouteId === routeMailboxId))
		) {
			return;
		}

		const mailbox = this.mailboxByRouteId(routeMailboxId);
		if (!mailbox?.jmapId) {
			this.messages = [];
			this.messagesError = 'Folder not found';
			this.messagesHasMore = false;
			this.messagesLoadSettledForRouteId = routeMailboxId;
			this.currentMailboxRouteId = routeMailboxId;
			return;
		}

		this.currentMailboxRouteId = routeMailboxId;
		this.clearSelection();
		this.messagesLoading = true;
		this.messagesError = null;
		this.selectedThread = [];
		this.selectedThreadId = null;
		this.selectedError = null;

		const accountId = client.getAccountId();
		if (browser) {
			const { getCachedMessagePreviews } = await import('$lib/db');
			const cached = await getCachedMessagePreviews(accountId, routeMailboxId);
			if (cached.length) {
				this.messages = cached.filter((message) => !isAccountSettingsSubject(message.subject));
				this.messagesFromCache = true;
				this.messagesHasMore = false;
				indexMessagesContacts(cached);
			}
		}

		try {
			const { emails, total, hasMore } = await client.queryEmails(mailbox.jmapId, PAGE_SIZE, 0);
			this.messages = mapVisiblePreviews(emails, routeMailboxId);
			this.messagesTotal = this.visibleMailboxTotal(mailbox.jmapId, total);
			this.messagesHasMore = hasMore;
			this.messagesFromCache = false;
			this.messagesError = null;
			indexMessagesContacts(this.messages);

			if (browser) {
				const { cacheMessagePreviews } = await import('$lib/db');
				await cacheMessagePreviews(accountId, routeMailboxId, this.messages);
			}
		} catch (error) {
			if (this.messagesFromCache && this.messages.length) {
				this.messagesError = 'Offline — showing cached messages';
				return;
			}
			this.messages = [];
			this.messagesTotal = 0;
			this.messagesHasMore = false;
			this.messagesFromCache = false;
			this.messagesError = error instanceof Error ? error.message : 'Failed to load messages';
		} finally {
			this.messagesLoading = false;
			this.messagesLoadSettledForRouteId = routeMailboxId;
		}
	}

	async loadMoreMessages(client: JMAPClient) {
		const routeMailboxId = this.currentMailboxRouteId;
		if (!routeMailboxId || !this.messagesHasMore || this.messagesLoadingMore) return;

		const mailbox = this.mailboxByRouteId(routeMailboxId);
		if (!mailbox?.jmapId) return;

		this.messagesLoadingMore = true;
		try {
			const position = this.messages.length;
			const { emails, hasMore } = await client.queryEmails(mailbox.jmapId, PAGE_SIZE, position);
			const previews = mapVisiblePreviews(emails, routeMailboxId);
			this.messages = [...this.messages, ...previews];
			this.messagesHasMore = hasMore;
			this.messagesFromCache = false;
			indexMessagesContacts(previews);

			if (browser) {
				const { cacheMessagePreviews } = await import('$lib/db');
				await cacheMessagePreviews(client.getAccountId(), routeMailboxId, previews);
			}
		} catch (error) {
			this.messagesError = error instanceof Error ? error.message : 'Failed to load more messages';
		} finally {
			this.messagesLoadingMore = false;
		}
	}

	async loadMessage(client: JMAPClient, routeMailboxId: string, threadId: string) {
		if (
			this.selectedThreadId === threadId &&
			this.currentMailboxRouteId === routeMailboxId &&
			this.selectedThread.length &&
			!this.selectedLoading
		) {
			return;
		}

		if (this.currentMailboxRouteId !== routeMailboxId || !this.messages.length) {
			await this.loadMessages(client, routeMailboxId);
		}

		const listMatch = this.messages.find((m) => m.threadId === threadId);
		if (!listMatch && !this.messages.some((m) => m.threadId === threadId)) {
			// Thread may not be in current page — still try to load it
		}

		this.selectedLoading = true;
		this.selectedError = null;
		this.selectedThreadId = threadId;
		const accountId = client.getAccountId();

		try {
			const emails = await client.getThreadEmails(threadId);
			if (!emails.length) {
				this.selectedThread = [];
				this.selectedError = 'Message not found';
				return;
			}

			if (emails.every((email) => isAccountSettingsSubject(email.subject))) {
				this.selectedThread = [];
				this.selectedError =
					'This message stores synced app settings and cannot be opened here. Use Settings → Backup to export or import preferences.';
				return;
			}

			this.selectedThread = emails
				.filter((email) => !isAccountSettingsSubject(email.subject))
				.map((email) => mapEmailDetail(email, routeMailboxId));
			indexMessagesContacts(this.selectedThread);

			if (browser) {
				try {
					const { cacheThread } = await import('$lib/db');
					await cacheThread(accountId, routeMailboxId, threadId, this.selectedThread);
				} catch {
					// Cache failures should not block reading
				}

				const attachments = this.selectedThread.flatMap((message) => message.attachments);
				if (attachments.length) {
					void import('$lib/attachments/download').then(({ prefetchAttachments }) =>
						prefetchAttachments(attachments)
					);
				}
			}

			if (settings.markAsReadOnOpen) {
				for (const message of this.selectedThread.filter((m) => m.unread)) {
					await this.markAsRead(client, message, true);
				}
			}
		} catch (error) {
			if (browser) {
				const { getCachedThread } = await import('$lib/db');
				const cached = await getCachedThread(accountId, threadId);
				if (cached?.length) {
					this.selectedThread = cached;
					this.selectedError = 'Offline — showing cached conversation';
					return;
				}
			}
			this.selectedThread = [];
			this.selectedError = error instanceof Error ? error.message : 'Failed to load message';
		} finally {
			this.selectedLoading = false;
		}
	}

	async markAsRead(client: JMAPClient, message: MessagePreview, read: boolean) {
		const previousUnread = message.unread;
		this.setPendingKeyword(message.id, { unread: !read });
		this.patchMessage(message.id, { unread: !read });
		this.patchThreadMessage(message.id, { unread: !read });
		if (previousUnread && read) {
			this.adjustUnreadCount(message.mailboxId, -1);
		} else if (!previousUnread && !read) {
			this.adjustUnreadCount(message.mailboxId, 1);
		}

		try {
			await client.markAsRead(message.id, read);
			this.clearPendingKeyword(message.id, 'unread');
		} catch {
			this.clearPendingKeyword(message.id, 'unread');
			this.patchMessage(message.id, { unread: previousUnread });
			this.patchThreadMessage(message.id, { unread: previousUnread });
			if (previousUnread && read) {
				this.adjustUnreadCount(message.mailboxId, 1);
			} else if (!previousUnread && !read) {
				this.adjustUnreadCount(message.mailboxId, -1);
			}
		}
	}

	async toggleStar(client: JMAPClient, message: MessagePreview) {
		const next = !message.starred;
		this.setPendingKeyword(message.id, { starred: next });
		this.patchMessage(message.id, { starred: next });
		this.patchThreadMessage(message.id, { starred: next });

		try {
			await client.toggleStar(message.id, next);
			this.clearPendingKeyword(message.id, 'starred');
		} catch {
			this.clearPendingKeyword(message.id, 'starred');
			this.patchMessage(message.id, { starred: !next });
			this.patchThreadMessage(message.id, { starred: !next });
		}
	}

	async moveMessage(client: JMAPClient, message: MessagePreview, targetRole: Mailbox['role']) {
		const target = this.mailboxes.find((mb) => mb.role === targetRole);
		if (!target?.jmapId) throw new Error(`${targetRole ?? 'target'} folder not found`);

		const sourceRouteId = message.mailboxId;
		const sourceJmapId = this.mailboxByRouteId(sourceRouteId)?.jmapId;
		const snapshot = { ...message };

		await client.moveToMailbox(message.id, target.jmapId, sourceJmapId);
		this.removeMessage(message);

		if (sourceJmapId) {
			const label =
				targetRole === 'archive'
					? snapshot.subject
						? `Archived “${snapshot.subject}”`
						: 'Message archived'
					: `Moved to ${target.name}`;
			this.offerMoveUndo({
				client,
				snapshots: [snapshot],
				sourceRouteId,
				sourceJmapId,
				message: label
			});
		}
	}

	async moveMessageToMailbox(client: JMAPClient, message: MessagePreview, targetRouteId: string) {
		const target = this.mailboxByRouteId(targetRouteId);
		if (!target?.jmapId) throw new Error('Folder not found');

		const sourceRouteId = message.mailboxId;
		const sourceJmapId = this.mailboxByRouteId(sourceRouteId)?.jmapId;
		const snapshot = { ...message };

		await client.moveToMailbox(message.id, target.jmapId, sourceJmapId);
		this.removeMessage(message);

		if (sourceJmapId) {
			this.offerMoveUndo({
				client,
				snapshots: [snapshot],
				sourceRouteId,
				sourceJmapId,
				message: `Moved to ${target.name}`
			});
		}
	}

	async deleteMessage(client: JMAPClient, message: MessagePreview, routeMailboxId: string) {
		const trash = this.mailboxes.find((mb) => mb.role === 'trash');
		const currentMailbox = this.mailboxByRouteId(routeMailboxId);
		const snapshot = { ...message };
		const sourceJmapId = currentMailbox?.jmapId;

		if (currentMailbox?.role === 'trash') {
			await client.destroyEmail(message.id);
			this.removeMessage(message);
			return;
		}

		if (trash?.jmapId) {
			await client.moveToMailbox(message.id, trash.jmapId, sourceJmapId);
		} else {
			await client.destroyEmail(message.id);
			this.removeMessage(message);
			return;
		}

		this.removeMessage(message);

		if (sourceJmapId) {
			this.offerMoveUndo({
				client,
				snapshots: [snapshot],
				sourceRouteId: routeMailboxId,
				sourceJmapId,
				message: snapshot.subject ? `Moved “${snapshot.subject}” to trash` : 'Moved to trash'
			});
		}
	}

	clearSelection() {
		this.selectedMessageIds = new Set();
		this.selectionAnchorId = null;
		this.bulkActionLoading = false;
	}

	private applySelection(next: Set<string>, anchor: string | null) {
		if (next.size === 0) {
			this.clearSelection();
			return;
		}

		this.selectedMessageIds = next;
		this.selectionAnchorId = anchor;
	}

	selectMessageAt(
		messageId: string,
		options: { shift?: boolean; ctrl?: boolean; activeMessageId?: string | null } = {}
	) {
		const index = this.messages.findIndex((message) => message.id === messageId);
		if (index < 0) return;

		const shift = options.shift ?? false;
		const ctrl = options.ctrl ?? false;
		const wasSelecting = this.selectedMessageIds.size > 0;

		if (!wasSelecting && !shift && !ctrl) return;

		let next = new Set(this.selectedMessageIds);
		let anchor = this.selectionAnchorId;

		if (!wasSelecting) {
			const activeId = options.activeMessageId ?? null;
			if (activeId) {
				next = new Set([activeId]);
				anchor = activeId;
			} else {
				next = new Set();
				anchor = null;
			}
		}

		if (shift) {
			const anchorId = anchor ?? options.activeMessageId ?? messageId;
			const anchorIndex = this.messages.findIndex((message) => message.id === anchorId);
			if (anchorIndex < 0) {
				next.add(messageId);
				anchor = messageId;
			} else {
				const start = Math.min(anchorIndex, index);
				const end = Math.max(anchorIndex, index);
				if (!ctrl) next = new Set();
				for (let i = start; i <= end; i++) {
					next.add(this.messages[i].id);
				}
			}
		} else if (ctrl) {
			if (next.has(messageId)) next.delete(messageId);
			else next.add(messageId);
			anchor = messageId;
		} else {
			if (next.has(messageId)) next.delete(messageId);
			else next.add(messageId);
			anchor = messageId;
		}

		this.applySelection(next, anchor);
	}

	toggleMessageSelection(messageId: string) {
		const next = new Set(this.selectedMessageIds);
		if (next.has(messageId)) next.delete(messageId);
		else next.add(messageId);
		this.applySelection(next, messageId);
	}

	selectAllMessages() {
		this.selectedMessageIds = new Set(this.messages.map((message) => message.id));
		this.selectionAnchorId = this.messages[0]?.id ?? null;
	}

	selectMessagesByFilter(filter: 'all' | 'read' | 'unread' | 'none') {
		if (filter === 'none') {
			this.clearSelection();
			return;
		}

		const matching = this.messages.filter((message) => {
			if (filter === 'all') return true;
			if (filter === 'read') return !message.unread;
			return message.unread;
		});

		if (!matching.length) {
			this.clearSelection();
			return;
		}

		this.selectedMessageIds = new Set(matching.map((message) => message.id));
		this.selectionAnchorId = matching[0]?.id ?? null;
	}

	async bulkArchive(client: JMAPClient) {
		const messages = this.selectedMessages();
		if (!messages.length) return;

		const archive = this.archiveMailbox();
		if (!archive?.jmapId) throw new Error('Archive folder not found');

		const sourceRouteId = this.currentMailboxRouteId;
		const sourceJmapId = sourceRouteId
			? this.mailboxByRouteId(sourceRouteId)?.jmapId
			: undefined;
		const snapshots = messages.map((message) => ({ ...message }));

		this.bulkActionLoading = true;
		try {
			await client.moveEmailsToMailbox(
				messages.map((message) => message.id),
				archive.jmapId,
				sourceJmapId
			);
			for (const message of messages) {
				this.removeMessage(message);
			}
			this.clearSelection();
			if (sourceRouteId && sourceJmapId) {
				this.offerMoveUndo({
					client,
					snapshots,
					sourceRouteId,
					sourceJmapId,
					message:
						snapshots.length === 1
							? 'Message archived'
							: `${snapshots.length} messages archived`
				});
			}
		} finally {
			this.bulkActionLoading = false;
		}
	}

	async bulkMoveToMailbox(client: JMAPClient, targetRouteId: string) {
		const messages = this.selectedMessages();
		if (!messages.length) return;

		const target = this.mailboxByRouteId(targetRouteId);
		if (!target?.jmapId) throw new Error('Folder not found');
		const sourceRouteId = this.currentMailboxRouteId;
		const sourceJmapId = sourceRouteId
			? this.mailboxByRouteId(sourceRouteId)?.jmapId
			: undefined;

		this.bulkActionLoading = true;
		try {
			await client.moveEmailsToMailbox(
				messages.map((message) => message.id),
				target.jmapId,
				sourceJmapId
			);
			for (const message of messages) {
				this.removeMessage(message);
			}
			this.clearSelection();
		} finally {
			this.bulkActionLoading = false;
		}
	}

	async bulkMarkAsRead(client: JMAPClient) {
		const messages = this.selectedMessages().filter((message) => message.unread);
		if (!messages.length) return;

		this.bulkActionLoading = true;
		try {
			for (const message of messages) {
				await this.markAsRead(client, message, true);
			}
			this.clearSelection();
		} finally {
			this.bulkActionLoading = false;
		}
	}

	async bulkMarkAsUnread(client: JMAPClient) {
		const messages = this.selectedMessages().filter((message) => !message.unread);
		if (!messages.length) return;

		this.bulkActionLoading = true;
		try {
			for (const message of messages) {
				await this.markAsRead(client, message, false);
			}
			this.clearSelection();
		} finally {
			this.bulkActionLoading = false;
		}
	}

	async bulkDelete(client: JMAPClient, routeMailboxId: string) {
		const messages = this.selectedMessages();
		if (!messages.length) return;

		const currentMailbox = this.mailboxByRouteId(routeMailboxId);
		const trash = this.mailboxes.find((mb) => mb.role === 'trash');
		const ids = messages.map((message) => message.id);
		const snapshots = messages.map((message) => ({ ...message }));
		const sourceJmapId = currentMailbox?.jmapId;

		this.bulkActionLoading = true;
		try {
			if (currentMailbox?.role === 'trash') {
				await client.destroyEmails(ids);
			} else if (trash?.jmapId) {
				await client.moveEmailsToMailbox(ids, trash.jmapId, sourceJmapId);
			} else {
				await client.destroyEmails(ids);
			}

			for (const message of messages) {
				this.removeMessage(message);
			}
			this.clearSelection();

			if (currentMailbox?.role !== 'trash' && sourceJmapId) {
				this.offerMoveUndo({
					client,
					snapshots,
					sourceRouteId: routeMailboxId,
					sourceJmapId,
					message:
						snapshots.length === 1
							? 'Moved to trash'
							: `${snapshots.length} messages moved to trash`
				});
			}
		} finally {
			this.bulkActionLoading = false;
		}
	}

	async handlePushChange(client: JMAPClient, accountChanges: { Email?: string; Mailbox?: string }) {
		const { syncEngine } = await import('$lib/sync/engine');
		try {
			await syncEngine.handlePushChange(client, accountChanges);
		} catch (error) {
			console.warn('[mail] Push sync failed:', error);
			const now = Date.now();
			if (now - this.lastFallbackRefreshAt < 10_000) return;
			this.lastFallbackRefreshAt = now;
			const routeId = this.currentMailboxRouteId;
			if (routeId) {
				void this.refreshMessages(client, routeId);
			}
		}
	}

	async applyEmailSync(client: JMAPClient, emails: JMAPEmail[], destroyed: string[]) {
		const routeId = this.currentMailboxRouteId;
		if (!routeId) return;

		const mailbox = this.mailboxByRouteId(routeId);
		if (!mailbox?.jmapId) return;

		const onlyHiddenChanges =
			emails.length > 0 &&
			emails.every((email) => isAccountSettingsSubject(email.subject)) &&
			!destroyed.some((id) => this.messages.some((message) => message.id === id));

		if (onlyHiddenChanges) {
			void this.refreshMailboxes(client);
			return;
		}

		const accountId = client.getAccountId();
		const mailboxJmapId = mailbox.jmapId;
		let next = [...this.messages];
		let totalDelta = 0;

		for (const id of destroyed) {
			const wasInList = next.some((m) => m.id === id);
			next = next.filter((m) => m.id !== id);
			if (wasInList) totalDelta -= 1;
			this.removeFromSelectedThread(id);
		}

		for (const email of emails) {
			if (!isVisibleListEmail(email)) continue;

			const inMailbox = !!email.mailboxIds?.[mailboxJmapId];
			const preview = this.applyPendingKeywords(email.id, mapEmailPreview(email, routeId));
			const existingIdx = next.findIndex((m) => m.id === email.id);

			if (inMailbox) {
				if (existingIdx >= 0) {
					if (!messagePreviewEqual(next[existingIdx], preview)) {
						next[existingIdx] = preview;
					}
				} else {
					next.push(preview);
					totalDelta += 1;
				}
			} else if (existingIdx >= 0) {
				next = next.filter((m) => m.id !== email.id);
				totalDelta -= 1;
			}

			this.patchSelectedFromEmail(email, routeId);
		}

		next.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());

		if (totalDelta === 0 && messagePreviewsEqual(this.messages, next)) {
			return;
		}

		this.messages = next;
		this.messagesTotal = Math.max(0, this.messagesTotal + totalDelta);
		this.messagesFromCache = false;

		if (browser) {
			const { cacheMessagePreviews } = await import('$lib/db');
			const previews = emails
				.filter((email) => email.mailboxIds?.[mailboxJmapId] && isVisibleListEmail(email))
				.map((email) => mapEmailPreview(email, routeId));
			if (previews.length) {
				await cacheMessagePreviews(accountId, routeId, previews);
			}
		}

		const threadId = this.selectedThreadId;
		if (threadId) {
			const hasNewMessage = emails.some(
				(email) => email.threadId === threadId && !this.selectedThread.some((m) => m.id === email.id)
			);

			if (hasNewMessage) {
				try {
					const threadEmails = await client.getThreadEmails(threadId);
					this.setSelectedThread(threadEmails, routeId);
				} catch {
					// Background refresh — ignore transient errors
				}
			}
		}
	}

	notifyNewMail(created: string[], emails: JMAPEmail[]) {
		if (!browser || !settings.notifyOnNewMail || !created.length) return;

		const inbox = this.mailboxes.find((mb) => mb.role === 'inbox');
		if (!inbox?.jmapId) return;

		const createdIds = new Set(created);
		const incoming = emails.filter(
			(email) =>
				createdIds.has(email.id) &&
				email.mailboxIds?.[inbox.jmapId!] &&
				!email.keywords?.$seen
		);

		if (!incoming.length) return;

		const notifiable = incoming.filter((email) => email.threadId !== this.selectedThreadId);

		if (!notifiable.length) return;

		if (notifiable.length === 1) {
			const email = notifiable[0];
			const from = email.from?.[0]?.name?.trim() || email.from?.[0]?.email || 'Someone';
			const subject = email.subject?.trim() || '(no subject)';
			const message = `New mail from ${from}: ${subject}`;
			toast.showAction(message, 'info', undefined, 5_000, { force: true });
			if (!document.hasFocus()) {
				showBrowserNotification('New mail', `${from}: ${subject}`);
			}
			return;
		}

		const message = `${notifiable.length} new messages in Inbox`;
		toast.showAction(message, 'info', undefined, 5_000, { force: true });
		if (!document.hasFocus()) {
			showBrowserNotification('New mail', message);
		}
	}

	setSelectedThread(emails: JMAPEmail[], routeMailboxId: string) {
		this.selectedThread = emails.map((email) => mapEmailDetail(email, routeMailboxId));
		indexMessagesContacts(this.selectedThread);

		if (browser && this.selectedThreadId && this.selectedThread.length) {
			void import('$lib/db').then(({ getAccountId, cacheThread }) => {
				const accountId = getAccountId();
				if (!accountId || !this.selectedThreadId) return;
				return cacheThread(accountId, routeMailboxId, this.selectedThreadId, this.selectedThread);
			});
		}
	}

	applyMailboxSync(mailboxes: JMAPMailbox[], destroyed: string[]) {
		let next = [...this.mailboxes];

		for (const id of destroyed) {
			next = next.filter((mb) => mb.jmapId !== id && mb.id !== id);
		}

		for (const mb of mailboxes) {
			const mapped = this.decorateMailbox(mb);
			const idx = next.findIndex((item) => item.jmapId === mapped.jmapId);
			if (idx >= 0) next[idx] = mapped;
			else next.push(mapped);
		}

		this.mailboxes = next.sort(sortMailboxes);
		applyUnreadPrefixToDocument();
	}

	async refreshMailboxes(client: JMAPClient) {
		try {
			await this.syncHiddenSettingsCounts(client);
			const list = await client.getMailboxes();
			this.mailboxes = list.map((mb) => this.decorateMailbox(mb)).sort(sortMailboxes);
			applyUnreadPrefixToDocument();
		} catch {
			// Background refresh — ignore transient errors
		}
	}

	async refreshMessages(client: JMAPClient, routeMailboxId: string) {
		const mailbox = this.mailboxByRouteId(routeMailboxId);
		if (!mailbox?.jmapId) return;

		try {
			const { emails, total, hasMore } = await client.queryEmails(mailbox.jmapId, PAGE_SIZE, 0);
			const previews = mapVisiblePreviews(emails, routeMailboxId);
			if (!messagePreviewsEqual(this.messages, previews)) {
				this.messages = previews;
				this.messagesFromCache = false;

				if (browser) {
					const { cacheMessagePreviews } = await import('$lib/db');
					await cacheMessagePreviews(client.getAccountId(), routeMailboxId, previews);
				}
			}
			this.messagesTotal = this.visibleMailboxTotal(mailbox.jmapId, total);
			this.messagesHasMore = hasMore;
		} catch {
			// Background refresh — ignore transient errors
		}
	}

	mailboxByRouteId(routeId: string): Mailbox | undefined {
		return (
			this.mailboxes.find((mb) => mb.id === routeId) ??
			this.mailboxes.find((mb) => mb.jmapId === routeId)
		);
	}

	archiveMailbox(): Mailbox | undefined {
		return this.mailboxes.find((mb) => mb.role === 'archive' && mb.jmapId);
	}

	canArchiveFrom(mailbox: Mailbox | null | undefined): boolean {
		return !!this.archiveMailbox() && mailbox?.role !== 'archive';
	}

	private patchThreadMessage(id: string, patch: Partial<MessageDetail>) {
		if (!this.selectedThread.some((m) => m.id === id)) return;
		this.selectedThread = this.selectedThread.map((m) => (m.id === id ? { ...m, ...patch } : m));
	}

	private setPendingKeyword(id: string, patch: { starred?: boolean; unread?: boolean }) {
		this.pendingKeywords.set(id, { ...this.pendingKeywords.get(id), ...patch });
	}

	private clearPendingKeyword(id: string, key: 'starred' | 'unread') {
		const pending = this.pendingKeywords.get(id);
		if (!pending) return;
		delete pending[key];
		if (Object.keys(pending).length === 0) {
			this.pendingKeywords.delete(id);
		}
	}

	private applyPendingKeywords(id: string, preview: MessagePreview): MessagePreview {
		const pending = this.pendingKeywords.get(id);
		if (!pending) return preview;
		return {
			...preview,
			...(pending.starred !== undefined && { starred: pending.starred }),
			...(pending.unread !== undefined && { unread: pending.unread })
		};
	}

	private patchSelectedFromEmail(email: JMAPEmail, routeMailboxId: string) {
		if (!this.selectedThread.some((m) => m.id === email.id)) return;
		const preview = this.applyPendingKeywords(email.id, mapEmailPreview(email, routeMailboxId));
		this.selectedThread = this.selectedThread.map((m) =>
			m.id === email.id ? { ...m, ...preview } : m
		);
	}

	private removeFromSelectedThread(id: string) {
		if (!this.selectedThread.some((m) => m.id === id)) return;
		this.selectedThread = this.selectedThread.filter((m) => m.id !== id);
		if (!this.selectedThread.length) {
			this.selectedThreadId = null;
		}
	}

	private patchMessage(id: string, patch: Partial<MessagePreview>) {
		this.messages = this.messages.map((m) => (m.id === id ? { ...m, ...patch } : m));
		if (browser) {
			void import('$lib/db').then(({ getAccountId, patchCachedMessage }) => {
				const accountId = getAccountId();
				if (!accountId) return;
				return patchCachedMessage(accountId, id, patch);
			});
		}
	}

	private removeMessage(message: MessagePreview) {
		if (message.unread) {
			this.adjustUnreadCount(message.mailboxId, -1);
		}
		this.messages = this.messages.filter((m) => m.id !== message.id);
		this.messagesTotal = Math.max(0, this.messagesTotal - 1);
		if (browser) {
			void import('$lib/db').then(({ getAccountId, removeCachedMessage }) => {
				const accountId = getAccountId();
				if (!accountId) return;
				return removeCachedMessage(accountId, message.id);
			});
		}
		if (this.selectedThread.some((m) => m.id === message.id)) {
			this.selectedThread = this.selectedThread.filter((m) => m.id !== message.id);
			if (!this.selectedThread.length) {
				this.selectedThreadId = null;
			}
		}
	}

	restoreMessage(message: MessagePreview) {
		if (this.messages.some((m) => m.id === message.id)) return;

		this.messages = [...this.messages, message].sort(
			(a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
		);
		this.messagesTotal += 1;
		if (message.unread) {
			this.adjustUnreadCount(message.mailboxId, 1);
		}

		if (browser) {
			void import('$lib/db').then(({ getAccountId, patchCachedMessage }) => {
				const accountId = getAccountId();
				if (!accountId) return;
				return patchCachedMessage(accountId, message.id, message);
			});
		}
	}

	private offerMoveUndo(params: {
		client: JMAPClient;
		snapshots: MessagePreview[];
		sourceRouteId: string;
		sourceJmapId: string;
		message: string;
	}) {
		const snapshots = params.snapshots.map((message) => ({ ...message }));
		toast.showUndo(params.message, async () => {
			try {
				await params.client.moveEmailsToMailbox(
					snapshots.map((message) => message.id),
					params.sourceJmapId
				);
				if (this.currentMailboxRouteId === params.sourceRouteId) {
					for (const message of snapshots) {
						this.restoreMessage(message);
					}
				}
			} catch (error) {
				toast.show(error instanceof Error ? error.message : 'Undo failed', 'error');
			}
		});
	}

	private adjustUnreadCount(routeId: string, delta: number) {
		this.mailboxes = this.mailboxes.map((mb) =>
			mb.id === routeId ? { ...mb, unread: Math.max(0, mb.unread + delta) } : mb
		);
		applyUnreadPrefixToDocument();
	}

	reset() {
		this.mailboxes = [];
		this.mailboxesLoading = false;
		this.mailboxesError = null;
		this.messages = [];
		this.messagesLoading = false;
		this.messagesLoadingMore = false;
		this.messagesError = null;
		this.messagesTotal = 0;
		this.messagesHasMore = false;
		this.messagesFromCache = false;
		this.currentMailboxRouteId = null;
		this.messagesLoadSettledForRouteId = null;
		this.selectedThread = [];
		this.selectedThreadId = null;
		this.selectedLoading = false;
		this.selectedError = null;
		this.clearSelection();
		this.pendingKeywords.clear();
	}
}

export const mail = new MailStore();
