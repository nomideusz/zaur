import type { JMAPClient } from '$lib/jmap/client';
import { browser } from '$app/environment';
import { mapEmailDetail, mapEmailPreview } from '$lib/jmap/map';
import type { JMAPEmail, JMAPMailbox } from '$lib/jmap/types';
import { isAccountSettingsSubject } from '$lib/settings/account-settings-types';
import {
	canMarkImportantFromMailboxRole,
	mailboxDisplayName,
	mailboxKindOrderForMailbox,
	mailboxRoleFromKind,
	mailboxRouteId,
	resolveMailboxKind,
	shouldClearImportantOnMoveTo
} from '$lib/mail/mailboxes';
import { importantMarker } from '$lib/mail/important-marker.svelte';
import { LABEL_MARK_SEEN, LABEL_UNSEE } from '$lib/mail/new-mail';
import type { Mailbox, MessageDetail, MessagePreview } from '$lib/types/mail';
import { settings } from '$lib/stores/settings.svelte';
import { toast } from '$lib/stores/toast.svelte';
import { applyUnreadPrefixToDocument } from '$lib/utils/document-title';
import { showBrowserNotification } from '$lib/utils/notifications';
import { recordMessages } from '$lib/utils/contact-index';

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
		a.important === b.important &&
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

function mapMailbox(mb: JMAPMailbox): Mailbox {
	const kind = resolveMailboxKind({ name: mb.name, role: mb.role });
	const role = mailboxRoleFromKind(kind);
	return {
		id: mailboxRouteId(mb.id, kind),
		jmapId: mb.id,
		name: mailboxDisplayName(kind, mb.name),
		role,
		unread: mb.unreadEmails ?? 0,
		total: mb.totalEmails ?? 0,
		parentId: mb.parentId ?? undefined
	};
}

function sortMailboxes(a: Mailbox, b: Mailbox): number {
	const aOrder = mailboxKindOrderForMailbox(a);
	const bOrder = mailboxKindOrderForMailbox(b);
	if (aOrder !== bOrder) return aOrder - bOrder;
	return a.name.localeCompare(b.name);
}

function indexMessagesContacts(messages: Array<MessagePreview | MessageDetail>) {
	if (!browser || !messages.length) return;

	void import('$lib/db').then(({ getAccountId }) => {
		const accountId = getAccountId();
		if (!accountId) return;
		recordMessages(accountId, messages);
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
	/** JMAP Email/query offset for the next page (server row count, not filtered previews). */
	messagesQueryOffset = $state(0);
	messagesFromCache = $state(false);
	/** Unseen-only header filter — list queries exclude $seen while set. */
	messagesUnseenOnly = $state(false);
	currentMailboxRouteId = $state<string | null>(null);
	/** Last mailbox route id whose message list fetch finished (including empty folders). */
	messagesLoadSettledForRouteId = $state<string | null>(null);

	selectedThread = $state<MessageDetail[]>([]);
	selectedThreadId = $state<string | null>(null);
	selectedLoading = $state(false);
	selectedError = $state<string | null>(null);
	private openMessageGeneration = 0;
	private openMessageInflight: Promise<void> | null = null;
	private openMessageInflightKey: string | null = null;

	selectedMessageIds = $state<Set<string>>(new Set());
	selectionAnchorId = $state<string | null>(null);
	/** Visible list order for shift-range selection (sectioned inbox home, etc.). */
	selectionList = $state<MessagePreview[]>([]);
	bulkActionLoading = $state(false);

	/** True when one or more list messages are checked. */
	get hasSelection() {
		return this.selectedMessageIds.size > 0;
	}

	/** In-flight keyword changes the server may not have echoed yet. */
	private pendingKeywords = new Map<string, { starred?: boolean; unread?: boolean; important?: boolean }>();
	/** Hidden settings-sync emails per mailbox JMAP id (excluded from folder totals). */
	private hiddenSettingsPerMailbox = new Map<string, number>();
	/** Message ids removed from the current view (archive/trash/move) until the list reloads. */
	removedFromViewMessageIds = $state<Set<string>>(new Set());
	private blockMailboxRefreshUntil = 0;
	private lastFallbackRefreshAt = 0;
	/** Bumped when push sync mutates the open message list (guards loadMessages overwrites). */
	private messagesSyncRevision = 0;

	get selectedCount() {
		return this.selectedMessageIds.size;
	}

	selectedMessages(): MessagePreview[] {
		const byId = new Map<string, MessagePreview>();
		for (const message of this.messages) byId.set(message.id, message);
		for (const message of this.selectionList) byId.set(message.id, message);
		return [...this.selectedMessageIds]
			.map((id) => byId.get(id))
			.filter((message): message is MessagePreview => !!message);
	}

	setSelectionList(messages: MessagePreview[]) {
		this.selectionList = messages;
	}

	private selectableMessages(): MessagePreview[] {
		return this.selectionList.length > 0 ? this.selectionList : this.messages;
	}

	get selectableMessageList(): MessagePreview[] {
		return this.selectableMessages();
	}

	wasRemovedFromView(messageId: string): boolean {
		return this.removedFromViewMessageIds.has(messageId);
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

	private catalogMessageTotal(routeMailboxId: string | null): number {
		const mailbox = routeMailboxId ? this.mailboxByRouteId(routeMailboxId) : undefined;
		return Math.max(this.messagesTotal, mailbox?.total ?? 0);
	}

	private syncMessagesHasMore(hasMoreFromQuery: boolean, lastBatchSize?: number) {
		if (lastBatchSize === 0) {
			this.messagesHasMore = false;
			return;
		}
		if (lastBatchSize !== undefined && lastBatchSize < PAGE_SIZE) {
			this.messagesHasMore = false;
			return;
		}

		const catalogTotal = this.catalogMessageTotal(this.currentMailboxRouteId);
		this.messagesHasMore =
			hasMoreFromQuery || this.messagesQueryOffset < catalogTotal;
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
			const scheduled = this.mailboxes.find((mb) => mb.role === 'scheduled');
			if (scheduled?.total) void this.reconcileScheduled(client);
		} catch (error) {
			this.mailboxesError = error instanceof Error ? error.message : 'Failed to load folders';
			this.mailboxes = [];
		} finally {
			this.mailboxesLoading = false;
		}
	}

	private scheduledReconciledAt = 0;

	/** Move messages whose delayed send has been released from Scheduled to Sent. */
	async reconcileScheduled(client: JMAPClient, options?: { force?: boolean }) {
		if (!options?.force && Date.now() - this.scheduledReconciledAt < 60_000) return;
		this.scheduledReconciledAt = Date.now();
		try {
			const moved = await client.reconcileScheduledEmails();
			if (moved) {
				const list = await client.getMailboxes();
				this.mailboxes = list.map((mb) => this.decorateMailbox(mb)).sort(sortMailboxes);
			}
		} catch {
			// Best-effort housekeeping — released mail stays visible in Scheduled until next pass.
		}
	}

	async loadMessages(
		client: JMAPClient,
		routeMailboxId: string,
		options?: { force?: boolean; preserveOpenThreadId?: string; unseenOnly?: boolean }
	) {
		const unseenOnly = options?.unseenOnly ?? false;
		if (
			!options?.force &&
			this.messagesUnseenOnly === unseenOnly &&
			(this.messagesLoading ||
				(this.messagesLoadSettledForRouteId === routeMailboxId &&
					this.currentMailboxRouteId === routeMailboxId))
		) {
			return;
		}

		this.currentMailboxRouteId = routeMailboxId;
		this.messagesUnseenOnly = unseenOnly;

		const mailbox = this.mailboxByRouteId(routeMailboxId);
		if (!mailbox?.jmapId) {
			this.messages = [];
			this.messagesError = 'Folder not found';
			this.messagesHasMore = false;
			this.messagesLoadSettledForRouteId = routeMailboxId;
			return;
		}

		if (mailbox.role === 'scheduled') {
			await this.reconcileScheduled(client);
		}

		this.clearSelection();
		this.messagesError = null;
		this.messagesQueryOffset = 0;
		this.removedFromViewMessageIds = new Set();
		if (!options?.preserveOpenThreadId) {
			this.selectedThread = [];
			this.selectedThreadId = null;
			this.selectedError = null;
		}

		const accountId = client.getAccountId();
		let showedCache = false;
		// The preview cache holds the unfiltered list — skip it while the Unseen filter is on.
		if (browser && !unseenOnly) {
			const { getCachedMessagePreviews } = await import('$lib/db');
			const cached = await getCachedMessagePreviews(accountId, routeMailboxId);
			if (cached.length) {
				this.messages = cached.filter((message) => !isAccountSettingsSubject(message.subject));
				this.messagesFromCache = true;
				this.messagesQueryOffset = cached.length;
				this.messagesTotal = Math.max(mailbox.total ?? 0, cached.length);
				this.syncMessagesHasMore(
					cached.length >= PAGE_SIZE || (mailbox.total ?? 0) > cached.length,
					cached.length
				);
				indexMessagesContacts(cached);
				showedCache = true;
			} else {
				this.messages = [];
			}
		} else {
			this.messages = [];
		}
		this.messagesLoading = !showedCache && this.messages.length === 0;

		const syncRevisionAtStart = this.messagesSyncRevision;

		try {
			const { emails, total, hasMore } = await client.queryEmails(mailbox.jmapId, PAGE_SIZE, 0, {
				unseenOnly
			});
			const previews = mapVisiblePreviews(emails, routeMailboxId);
			this.messages =
				syncRevisionAtStart !== this.messagesSyncRevision
					? this.mergeQueryWithSyncedMessages(previews)
					: previews;
			this.messagesTotal = Math.max(
				this.visibleMailboxTotal(mailbox.jmapId, total),
				mailbox.total ?? 0
			);
			this.messagesQueryOffset = emails.length;
			this.syncMessagesHasMore(hasMore, emails.length);
			this.messagesFromCache = false;
			this.messagesError = null;
			indexMessagesContacts(this.messages);

			if (browser && !unseenOnly) {
				const { cacheMessagePreviews } = await import('$lib/db');
				await cacheMessagePreviews(accountId, routeMailboxId, this.messages);
			}
		} catch (error) {
			if (this.messagesFromCache && this.messages.length) {
				this.messagesError = 'Offline — showing cached messages';
				this.syncMessagesHasMore(
					this.messages.length >= PAGE_SIZE ||
						(mailbox.total ?? 0) > this.messages.length,
					this.messages.length
				);
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
		if (!routeMailboxId || this.messagesLoadingMore || !this.messagesHasMore) return;

		const mailbox = this.mailboxByRouteId(routeMailboxId);
		if (!mailbox?.jmapId) return;

		this.messagesLoadingMore = true;
		try {
			const position = this.messagesQueryOffset;
			const { emails, hasMore } = await client.queryEmails(mailbox.jmapId, PAGE_SIZE, position, {
				unseenOnly: this.messagesUnseenOnly
			});
			if (emails.length === 0) {
				this.messagesHasMore = false;
				return;
			}
			const previews = mapVisiblePreviews(emails, routeMailboxId);
			this.messages = [...this.messages, ...previews];
			this.messagesQueryOffset = position + emails.length;
			this.syncMessagesHasMore(hasMore, emails.length);
			this.messagesFromCache = false;
			indexMessagesContacts(previews);

			if (browser && !this.messagesUnseenOnly) {
				const { cacheMessagePreviews } = await import('$lib/db');
				await cacheMessagePreviews(client.getAccountId(), routeMailboxId, previews);
			}
		} catch (error) {
			this.messagesError = error instanceof Error ? error.message : 'Failed to load more messages';
		} finally {
			this.messagesLoadingMore = false;
		}
	}

	async loadMessage(
		client: JMAPClient,
		routeMailboxId: string,
		threadId: string,
		options?: { messageId?: string | null; force?: boolean }
	) {
		const focusMessageId = options?.messageId?.trim() || null;
		const inflightKey = `${routeMailboxId}:${threadId}:${focusMessageId ?? ''}`;

		if (
			!options?.force &&
			this.selectedThreadId === threadId &&
			this.currentMailboxRouteId === routeMailboxId &&
			this.selectedThread.length > 0 &&
			this.selectedThread.every((message) => message.mailboxId === routeMailboxId) &&
			!this.selectedLoading
		) {
			return;
		}

		if (!options?.force && this.openMessageInflight && this.openMessageInflightKey === inflightKey) {
			return this.openMessageInflight;
		}

		const generation = ++this.openMessageGeneration;
		this.openMessageInflightKey = inflightKey;

		const run = async () => {
			this.selectedLoading = true;
			this.selectedError = null;
			this.selectedThreadId = threadId;
			this.selectedThread = [];

			if (this.currentMailboxRouteId !== routeMailboxId || !this.messages.length) {
				if (this.messagesLoading && this.currentMailboxRouteId === routeMailboxId) {
					await this.waitForMessagesLoad();
				} else {
					await this.loadMessages(client, routeMailboxId, { preserveOpenThreadId: threadId });
				}
			}

			if (generation !== this.openMessageGeneration) return;

			const accountId = client.getAccountId();
			let resolvedThreadId = threadId;

			try {
				let emails: Awaited<ReturnType<JMAPClient['getThreadEmails']>> = [];

				if (focusMessageId) {
					const email = await client.getEmail(focusMessageId);
					if (generation !== this.openMessageGeneration) return;
					if (email) {
						resolvedThreadId = email.threadId || threadId;
						emails = await client.getThreadEmails(resolvedThreadId);
						if (generation !== this.openMessageGeneration) return;
						if (!emails.length) {
							emails = [email];
						}
					}
				}

				if (!emails.length) {
					emails = await client.getThreadEmails(threadId);
					resolvedThreadId = threadId;
					if (generation !== this.openMessageGeneration) return;
				}

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

				this.selectedThreadId = resolvedThreadId;
				this.selectedThread = emails
					.filter((email) => !isAccountSettingsSubject(email.subject))
					.map((email) => mapEmailDetail(email, routeMailboxId));
				indexMessagesContacts(this.selectedThread);

				if (settings.markReadOnOpen) {
					for (const msg of this.selectedThread) {
						if (msg.unread) {
							void this.markAsRead(client, msg, true);
						}
					}
				}

				if (browser) {
					try {
						const { cacheThread } = await import('$lib/db');
						await cacheThread(accountId, routeMailboxId, resolvedThreadId, this.selectedThread);
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
			} catch (error) {
				if (generation !== this.openMessageGeneration) return;
				if (browser) {
					const { getCachedThread } = await import('$lib/db');
					const cached = await getCachedThread(accountId, resolvedThreadId);
					if (cached?.length) {
						this.selectedThreadId = resolvedThreadId;
						this.selectedThread = cached;
						this.selectedError = 'Offline — showing cached conversation';
						return;
					}
				}
				this.selectedThread = [];
				this.selectedError = error instanceof Error ? error.message : 'Failed to load message';
			} finally {
				if (generation === this.openMessageGeneration) {
					this.selectedLoading = false;
				}
			}
		};

		this.openMessageInflight = run().finally(() => {
			if (this.openMessageInflightKey === inflightKey) {
				this.openMessageInflight = null;
				this.openMessageInflightKey = null;
			}
		});
		return this.openMessageInflight;
	}

	/** Abort a stuck or stale open-message fetch (e.g. when switching modes). */
	cancelOpenMessage() {
		this.openMessageGeneration++;
		this.openMessageInflight = null;
		this.openMessageInflightKey = null;
		this.selectedLoading = false;
	}

	private waitForMessagesLoad(): Promise<void> {
		if (!this.messagesLoading) return Promise.resolve();
		return new Promise((resolve) => {
			const started = Date.now();
			const tick = () => {
				if (!this.messagesLoading) {
					resolve();
					return;
				}
				if (Date.now() - started > 30_000) {
					resolve();
					return;
				}
				setTimeout(tick, 50);
			};
			tick();
		});
	}

	async markMessageDone(client: JMAPClient, message: MessagePreview) {
		if (!message.unread) return;
		await this.markAsRead(client, message, true);
	}

	/** File as normal — remove Important pin (if any) and clear New. */
	async fileAsNotImportant(client: JMAPClient, message: MessagePreview) {
		if (message.important) {
			await this.setMessagesImportant(client, [message], false);
		}
		const current =
			this.messages.find((entry) => entry.id === message.id) ??
			this.selectedThread.find((entry) => entry.id === message.id) ??
			message;
		if (current.unread) {
			await this.markMessageDone(client, current);
		}
	}

	async markMessageNew(client: JMAPClient, message: MessagePreview) {
		if (message.unread) return;
		await this.markAsRead(client, message, false);
	}

	private async markAsRead(client: JMAPClient, message: MessagePreview, read: boolean) {
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

	async toggleImportant(client: JMAPClient, message: MessagePreview) {
		await this.setMessagesImportant(client, [message], !message.important);
	}

	private async setMessagesImportant(
		client: JMAPClient,
		messages: MessagePreview[],
		important: boolean
	) {
		if (!messages.length) return;

		let targets = messages;
		if (important) {
			targets = messages.filter((message) =>
				canMarkImportantFromMailboxRole(this.mailboxByRouteId(message.mailboxId)?.role)
			);
			if (!targets.length) {
				throw new Error('Messages in Trash, Spam, or Drafts cannot be highlighted');
			}
		}

		const importantMailbox = this.importantMailbox();
		const ids = targets.map((message) => message.id);
		const newlyImportant = important
			? targets.filter((message) => !message.important)
			: [];
		const introInReader = newlyImportant.length === 1;

		for (const message of targets) {
			const clearsNew = important && message.unread;
			this.setPendingKeyword(message.id, {
				important,
				...(clearsNew ? { unread: false } : {})
			});
			if (important && !message.important) {
				importantMarker.markForIntroAnimation(message.id, { introInReader });
			}
		}

		this.patchMessages(
			targets.map((message) => {
				const clearsNew = important && message.unread;
				return {
					id: message.id,
					patch: {
						important,
						...(clearsNew ? { unread: false } : {})
					}
				};
			})
		);

		for (const message of targets) {
			const clearsNew = important && message.unread;
			this.patchThreadMessage(message.id, {
				important,
				...(clearsNew ? { unread: false } : {})
			});
			if (clearsNew) {
				this.adjustUnreadCount(message.mailboxId, -1);
			}
		}

		if (importantMailbox) {
			const totalDelta = important ? targets.length : -targets.length;
			let unreadDelta = 0;
			if (important) {
				// Marking important clears New — only already-normal messages count as unread there.
				for (const message of targets) {
					if (!message.unread) unreadDelta += 1;
				}
			} else {
				for (const message of targets) {
					if (message.unread) unreadDelta -= 1;
				}
			}
			this.adjustMailboxCounts(importantMailbox.id, totalDelta, unreadDelta);
		}

		try {
			await client.toggleImportant(ids, important, importantMailbox?.jmapId);
			if (important) {
				for (const message of targets) {
					if (!message.unread) continue;
					await this.markAsRead(client, message, true);
				}
			}
			for (const id of ids) {
				this.clearPendingKeyword(id, 'important');
			}
		} catch (error) {
			if (importantMailbox) {
				const totalDelta = important ? -targets.length : targets.length;
				let unreadDelta = 0;
				for (const message of targets) {
					if (message.unread) unreadDelta += important ? 1 : -1;
				}
				this.adjustMailboxCounts(importantMailbox.id, totalDelta, unreadDelta);
			}
			for (const message of targets) {
				this.clearPendingKeyword(message.id, 'important');
				this.patchMessage(message.id, { important: !important, unread: message.unread });
				this.patchThreadMessage(message.id, { important: !important, unread: message.unread });
				if (important && message.unread) {
					this.adjustUnreadCount(message.mailboxId, 1);
				}
			}
			throw error;
		}
	}

	private async clearImportantBeforeMove(
		client: JMAPClient,
		messages: MessagePreview[],
		target: Pick<Mailbox, 'role'>
	) {
		if (!shouldClearImportantOnMoveTo(target.role)) return;
		const flagged = messages.filter((message) => message.important);
		if (!flagged.length) return;
		await this.setMessagesImportant(client, flagged, false);
	}

	async moveMessage(client: JMAPClient, message: MessagePreview, targetRole: Mailbox['role']) {
		const target = this.mailboxes.find((mb) => mb.role === targetRole);
		if (!target?.jmapId) throw new Error(`${targetRole ?? 'target'} folder not found`);

		const sourceRouteId = this.currentMailboxRouteId ?? message.mailboxId;
		const sourceJmapId = this.mailboxByRouteId(sourceRouteId)?.jmapId;
		const snapshot = { ...message };

		await this.clearImportantBeforeMove(client, [snapshot], target);
		await client.moveToMailbox(message.id, target.jmapId, sourceJmapId);
		this.applyMoveAwayCounts([message], sourceRouteId, target);
		this.removeMessage(message, { skipCounts: true });

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
				targetJmapId: target.jmapId,
				message: label
			});
		}
	}

	async moveMessageToMailbox(client: JMAPClient, message: MessagePreview, targetRouteId: string) {
		const target = this.mailboxByRouteId(targetRouteId);
		if (!target?.jmapId) throw new Error('Folder not found');

		const sourceRouteId = this.currentMailboxRouteId ?? message.mailboxId;
		const sourceJmapId = this.mailboxByRouteId(sourceRouteId)?.jmapId;
		const snapshot = { ...message };

		await this.clearImportantBeforeMove(client, [snapshot], target);
		await client.moveToMailbox(message.id, target.jmapId, sourceJmapId);
		this.applyMoveAwayCounts([message], sourceRouteId, target);
		this.removeMessage(message, { skipCounts: true });

		if (sourceJmapId) {
			this.offerMoveUndo({
				client,
				snapshots: [snapshot],
				sourceRouteId,
				sourceJmapId,
				targetJmapId: target.jmapId,
				message: `Moved to ${target.name}`
			});
		}
	}

	async deleteMessage(client: JMAPClient, message: MessagePreview, routeMailboxId: string) {
		const trash = this.mailboxes.find((mb) => mb.role === 'trash');
		const currentMailbox = this.mailboxByRouteId(routeMailboxId);
		const snapshot = { ...message };
		const sourceJmapId = currentMailbox?.jmapId;

		if (currentMailbox?.role === 'trash' || currentMailbox?.role === 'drafts') {
			await client.destroyEmail(message.id);
			this.removeMessage(message);
			return;
		}

		if (trash?.jmapId) {
			await this.clearImportantBeforeMove(client, [snapshot], trash);
			await client.moveToMailbox(message.id, trash.jmapId, sourceJmapId);
		} else {
			await client.destroyEmail(message.id);
			this.removeMessage(message);
			return;
		}

		this.applyMoveAwayCounts([message], routeMailboxId, trash);
		this.removeMessage(message, { skipCounts: true });

		if (sourceJmapId) {
			this.offerMoveUndo({
				client,
				snapshots: [snapshot],
				sourceRouteId: routeMailboxId,
				sourceJmapId,
				targetJmapId: trash.jmapId,
				message: snapshot.subject ? `Moved “${snapshot.subject}” to trash` : 'Moved to trash'
			});
		}
	}

	clearSelection() {
		this.selectedMessageIds = new Set();
		this.selectionAnchorId = null;
		this.bulkActionLoading = false;
	}
	startSelection(messageId: string) {
		const list = this.selectableMessages();
		const index = list.findIndex((message) => message.id === messageId);
		if (index < 0) return;

		if (this.selectedMessageIds.size > 0) {
			this.toggleMessageSelection(messageId);
			return;
		}

		this.selectedMessageIds = new Set([messageId]);
		this.selectionAnchorId = messageId;
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
		const list = this.selectableMessages();
		const index = list.findIndex((message) => message.id === messageId);
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
			const anchorIndex = list.findIndex((message) => message.id === anchorId);
			if (anchorIndex < 0) {
				next.add(messageId);
				anchor = messageId;
			} else {
				const start = Math.min(anchorIndex, index);
				const end = Math.max(anchorIndex, index);
				if (!ctrl) next = new Set();
				for (let i = start; i <= end; i++) {
					next.add(list[i].id);
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
		const list = this.selectableMessages();
		this.selectedMessageIds = new Set(list.map((message) => message.id));
		this.selectionAnchorId = list[0]?.id ?? null;
	}

	selectMessagesByFilter(filter: 'all' | 'normal' | 'new' | 'none') {
		if (filter === 'none') {
			this.clearSelection();
			return;
		}

		const list = this.selectableMessages();
		const matching = list.filter((message) => {
			if (filter === 'all') return true;
			if (filter === 'normal') return !message.unread;
			return message.unread;
		});

		if (!matching.length) {
			this.clearSelection();
			return;
		}

		this.selectedMessageIds = new Set(matching.map((message) => message.id));
		this.selectionAnchorId = matching[0]?.id ?? null;
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
			await this.clearImportantBeforeMove(client, messages, target);
			await client.moveEmailsToMailbox(
				messages.map((message) => message.id),
				target.jmapId,
				sourceJmapId
			);
			this.applyMoveAwayCounts(messages, sourceRouteId, target);
			for (const message of messages) {
				this.removeMessage(message, { skipCounts: true });
			}
			this.clearSelection();
		} finally {
			this.bulkActionLoading = false;
		}
	}

	private async bulkSetNewState(client: JMAPClient, messages: MessagePreview[], read: boolean) {
		// `read` = desired $seen; `message.unread` is !seen — only update rows still in the old state.
		const targets = messages.filter((message) => message.unread === read);
		if (!targets.length) return;

		for (const message of targets) {
			this.setPendingKeyword(message.id, { unread: !read });
			this.patchMessage(message.id, { unread: !read });
			this.patchThreadMessage(message.id, { unread: !read });
			if (read) {
				this.adjustUnreadCount(message.mailboxId, -1);
			} else {
				this.adjustUnreadCount(message.mailboxId, 1);
			}
		}

		try {
			await client.markManyAsRead(
				targets.map((message) => message.id),
				read
			);
			for (const message of targets) {
				this.clearPendingKeyword(message.id, 'unread');
			}
		} catch (error) {
			for (const message of targets) {
				this.clearPendingKeyword(message.id, 'unread');
				this.patchMessage(message.id, { unread: read });
				this.patchThreadMessage(message.id, { unread: read });
				if (read) {
					this.adjustUnreadCount(message.mailboxId, 1);
				} else {
					this.adjustUnreadCount(message.mailboxId, -1);
				}
			}
			throw error;
		}
	}

	async bulkMarkAsSeen(client: JMAPClient) {
		const messages = this.selectedMessages().filter((message) => message.unread);
		if (!messages.length) return;

		this.bulkActionLoading = true;
		try {
			await this.bulkSetNewState(client, messages, true);
			this.clearSelection();
			toast.show(
				messages.length === 1
					? LABEL_MARK_SEEN
					: `${messages.length} messages marked seen`,
				'success'
			);
		} finally {
			this.bulkActionLoading = false;
		}
	}

	async bulkMarkAsDone(client: JMAPClient) {
		const messages = this.selectedMessages().filter((message) => message.unread);
		if (!messages.length) return;

		this.bulkActionLoading = true;
		try {
			const important = messages.filter((message) => message.important);
			if (important.length) {
				await this.setMessagesImportant(client, important, false);
			}
			await this.bulkSetNewState(client, messages, true);
			this.clearSelection();
			toast.show(
				messages.length === 1 ? 'Marked done' : `${messages.length} messages marked done`,
				'success'
			);
		} finally {
			this.bulkActionLoading = false;
		}
	}

	async bulkMarkAsNew(client: JMAPClient) {
		const messages = this.selectedMessages().filter((message) => !message.unread);
		if (!messages.length) return;

		this.bulkActionLoading = true;
		try {
			await this.bulkSetNewState(client, messages, false);
			this.clearSelection();
			toast.show(
				messages.length === 1 ? LABEL_UNSEE : `${messages.length} messages unseen`,
				'success'
			);
		} finally {
			this.bulkActionLoading = false;
		}
	}

	async bulkMarkAsImportant(client: JMAPClient) {
		const messages = this.selectedMessages().filter(
			(message) =>
				!message.important &&
				canMarkImportantFromMailboxRole(this.mailboxByRouteId(message.mailboxId)?.role)
		);
		if (!messages.length) return;

		this.bulkActionLoading = true;
		try {
			await this.setMessagesImportant(client, messages, true);
			this.clearSelection();
			toast.show(
				messages.length === 1
					? 'Highlighted'
					: `${messages.length} messages highlighted`,
				'success'
			);
		} finally {
			this.bulkActionLoading = false;
		}
	}

	async bulkMarkAsNotImportant(client: JMAPClient) {
		const messages = this.selectedMessages().filter(
			(message) => message.important && !message.unread
		);
		if (!messages.length) return;

		this.bulkActionLoading = true;
		try {
			await this.setMessagesImportant(client, messages, false);
			this.clearSelection();
			toast.show(
				messages.length === 1
					? 'Highlight removed'
					: `${messages.length} messages unmarked`,
				'success'
			);
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
				for (const message of messages) {
					this.removeMessage(message);
				}
			} else if (trash?.jmapId) {
				await this.clearImportantBeforeMove(client, snapshots, trash);
				await client.moveEmailsToMailbox(ids, trash.jmapId, sourceJmapId);
				this.applyMoveAwayCounts(messages, routeMailboxId, trash);
				for (const message of messages) {
					this.removeMessage(message, { skipCounts: true });
				}
			} else {
				await client.destroyEmails(ids);
				for (const message of messages) {
					this.removeMessage(message);
				}
			}
			this.clearSelection();

			if (currentMailbox?.role !== 'trash' && sourceJmapId && trash?.jmapId) {
				this.offerMoveUndo({
					client,
					snapshots,
					sourceRouteId: routeMailboxId,
					sourceJmapId,
					targetJmapId: trash.jmapId,
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

	private mergeQueryWithSyncedMessages(queryPreviews: MessagePreview[]): MessagePreview[] {
		const currentById = new Map(this.messages.map((message) => [message.id, message]));
		const queryIds = new Set(queryPreviews.map((message) => message.id));
		const merged = queryPreviews.map((message) => currentById.get(message.id) ?? message);

		for (const message of this.messages) {
			if (!queryIds.has(message.id)) merged.push(message);
		}

		merged.sort(
			(a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
		);
		return merged;
	}

	async applyEmailSync(
		client: JMAPClient,
		emails: JMAPEmail[],
		destroyed: string[]
	): Promise<boolean> {
		const routeId = this.currentMailboxRouteId;
		if (!routeId) return false;

		const mailbox = this.mailboxByRouteId(routeId);
		if (!mailbox?.jmapId) return false;

		const onlyHiddenChanges =
			emails.length > 0 &&
			emails.every((email) => isAccountSettingsSubject(email.subject)) &&
			!destroyed.some((id) => this.messages.some((message) => message.id === id));

		if (onlyHiddenChanges) {
			void this.refreshMailboxes(client);
			return true;
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
			return true;
		}

		this.messages = next;
		this.messagesSyncRevision += 1;
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

		return true;
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
				showBrowserNotification('Unseen mail', `${from}: ${subject}`);
			}
			return;
		}

		const message = `${notifiable.length} unseen messages in Inbox`;
		toast.showAction(message, 'info', undefined, 5_000, { force: true });
		if (!document.hasFocus()) {
			showBrowserNotification('Unseen mail', message);
		}
	}

	setSelectedThread(emails: JMAPEmail[], routeMailboxId: string) {
		this.selectedThread = emails.map((email) => {
			const detail = mapEmailDetail(email, routeMailboxId);
			return { ...detail, ...this.applyPendingKeywords(email.id, detail) };
		});
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
		if (Date.now() < this.blockMailboxRefreshUntil) return;
		try {
			await this.syncHiddenSettingsCounts(client);
			const list = await client.getMailboxes();
			this.mailboxes = list.map((mb) => this.decorateMailbox(mb)).sort(sortMailboxes);
			applyUnreadPrefixToDocument();
		} catch {
			// Background refresh — ignore transient errors
		}
	}

	async renameCustomFolder(client: JMAPClient, routeId: string, name: string): Promise<void> {
		const trimmed = name.trim();
		if (!trimmed) throw new Error('Folder name cannot be empty');

		const mailbox = this.mailboxByRouteId(routeId);
		if (!mailbox?.jmapId) throw new Error('Folder not found');
		if (mailbox.role !== 'custom') throw new Error('Cannot rename this folder');
		if (trimmed === mailbox.name) return;

		const previous = mailbox.name;
		this.patchMailboxName(routeId, trimmed);
		try {
			await client.renameMailbox(mailbox.jmapId, trimmed);
			toast.show(`Renamed to “${trimmed}”`, 'success');
		} catch (error) {
			this.patchMailboxName(routeId, previous);
			throw error;
		}
	}

	private patchMailboxName(routeId: string, name: string): void {
		this.mailboxes = this.mailboxes.map((mb) => (mb.id === routeId ? { ...mb, name } : mb));
	}

	async createCustomFolder(
		client: JMAPClient,
		name: string,
		parentRouteId?: string | null
	): Promise<Mailbox> {
		const trimmed = name.trim();
		if (!trimmed) throw new Error('Folder name cannot be empty');

		let parentJmapId: string | undefined;
		if (parentRouteId) {
			const parent = this.mailboxByRouteId(parentRouteId);
			if (!parent?.jmapId) throw new Error('Parent folder not found');
			if (parent.role !== 'custom') throw new Error('Cannot nest under this folder');
			parentJmapId = parent.jmapId;
		}

		const jmapId = await client.createMailbox(trimmed, parentJmapId ?? null);
		const [created] = await client.getMailboxesByIds([jmapId]);
		if (!created) throw new Error('Could not load new folder');

		const mapped = this.decorateMailbox(created);
		this.mailboxes = [...this.mailboxes, mapped].sort(sortMailboxes);
		toast.show(`Created “${trimmed}”`, 'success');
		return mapped;
	}

	/** Delete a custom folder (only custom folders, never role mailboxes). Returns false if the
	 *  user cancels the confirmation. Non-empty folders take their messages with them. */
	async deleteCustomFolder(client: JMAPClient, routeId: string): Promise<boolean> {
		const mailbox = this.mailboxByRouteId(routeId);
		if (!mailbox?.jmapId) throw new Error('Folder not found');
		if (mailbox.role !== 'custom') throw new Error('Cannot delete this folder');

		const messageCount = mailbox.total ?? 0;
		const { confirm: askConfirm } = await import('$lib/stores/confirm.svelte');
		const confirmed = await askConfirm.ask({
			title: 'Delete folder?',
			description:
				messageCount > 0
					? `Delete “${mailbox.name}” and its ${messageCount} message${messageCount === 1 ? '' : 's'}? This cannot be undone.`
					: `Delete “${mailbox.name}”?`,
			confirmLabel: 'Delete',
			tone: 'danger'
		});
		if (!confirmed) return false;

		await client.destroyMailbox(mailbox.jmapId, messageCount > 0);
		this.mailboxes = this.mailboxes.filter((mb) => mb.id !== routeId);
		toast.show(`Deleted “${mailbox.name}”`, 'success');
		return true;
	}

	/** Refresh folder totals (and drafts/sent lists) after sending a message. */
	async refreshAfterSend(client: JMAPClient, options?: { removedDraftId?: string }) {
		const removedDraftId = options?.removedDraftId;
		if (removedDraftId && this.messages.some((message) => message.id === removedDraftId)) {
			this.messages = this.messages.filter((message) => message.id !== removedDraftId);
			this.messagesTotal = Math.max(0, this.messagesTotal - 1);
			this.removeFromSelectedThread(removedDraftId);
		}

		await this.refreshMailboxes(client);

		const routeId = this.currentMailboxRouteId;
		if (routeId === 'drafts' || routeId === 'sent') {
			await this.refreshMessages(client, routeId);
		}
	}

	async refreshMessages(client: JMAPClient, routeMailboxId: string) {
		const mailbox = this.mailboxByRouteId(routeMailboxId);
		if (!mailbox?.jmapId) return;

		try {
			const { emails, total, hasMore } = await client.queryEmails(mailbox.jmapId, PAGE_SIZE, 0, {
				unseenOnly: this.messagesUnseenOnly
			});
			const previews = mapVisiblePreviews(emails, routeMailboxId);
			if (!messagePreviewsEqual(this.messages, previews)) {
				this.messages = previews;
				this.messagesFromCache = false;

				if (browser && !this.messagesUnseenOnly) {
					const { cacheMessagePreviews } = await import('$lib/db');
					await cacheMessagePreviews(client.getAccountId(), routeMailboxId, previews);
				}
			}
			this.messagesTotal = Math.max(
				this.visibleMailboxTotal(mailbox.jmapId, total),
				mailbox.total ?? 0
			);
			this.messagesQueryOffset = emails.length;
			this.syncMessagesHasMore(hasMore, emails.length);
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

	importantMailbox(): Mailbox | undefined {
		return this.mailboxes.find((mb) => mb.role === 'important' && mb.jmapId);
	}

	canMarkImportantInMailbox(mailbox: Mailbox | null | undefined): boolean {
		return canMarkImportantFromMailboxRole(mailbox?.role);
	}

	private patchThreadMessage(id: string, patch: Partial<MessageDetail>) {
		if (!this.selectedThread.some((m) => m.id === id)) return;
		this.selectedThread = this.selectedThread.map((m) => (m.id === id ? { ...m, ...patch } : m));
	}

	private setPendingKeyword(
		id: string,
		patch: { starred?: boolean; unread?: boolean; important?: boolean }
	) {
		this.pendingKeywords.set(id, { ...this.pendingKeywords.get(id), ...patch });
	}

	private clearPendingKeyword(id: string, key: 'starred' | 'unread' | 'important') {
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
			...(pending.unread !== undefined && { unread: pending.unread }),
			...(pending.important !== undefined && { important: pending.important })
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
		this.patchMessages([{ id, patch }]);
	}

	private patchMessages(updates: { id: string; patch: Partial<MessagePreview> }[]) {
		if (!updates.length) return;
		const byId = new Map(updates.map(({ id, patch }) => [id, patch]));
		const apply = (m: MessagePreview) => {
			const patch = byId.get(m.id);
			return patch ? { ...m, ...patch } : m;
		};
		this.messages = this.messages.map(apply);
		// selectionList is a snapshot the bulk bar prefers over messages — keep it
		// patched too, or re-selecting shows stale flags (e.g. Highlight after highlighting).
		if (this.selectionList.length) this.selectionList = this.selectionList.map(apply);
		if (browser) {
			void import('$lib/db').then(({ getAccountId, patchCachedMessage }) => {
				const accountId = getAccountId();
				if (!accountId) return;
				for (const { id, patch } of updates) {
					void patchCachedMessage(accountId, id, patch);
				}
			});
		}
	}

	private removeMessage(message: MessagePreview, options?: { skipCounts?: boolean }) {
		if (!options?.skipCounts) {
			if (message.unread) {
				this.adjustUnreadCount(message.mailboxId, -1);
			}
			this.adjustMailboxCounts(message.mailboxId, -1);
		}
		this.removedFromViewMessageIds = new Set([...this.removedFromViewMessageIds, message.id]);
		this.messages = this.messages.filter((m) => m.id !== message.id);
		this.messagesTotal = Math.max(0, this.messagesTotal - 1);
		if (browser) {
			void import('$lib/db').then(({ getAccountId, removeCachedMessage }) => {
				const accountId = getAccountId();
				if (!accountId) return;
				return removeCachedMessage(accountId, message.id);
			});
		}
	}

	private clearRemovedFromView(messageId: string) {
		if (!this.removedFromViewMessageIds.has(messageId)) return;
		const next = new Set(this.removedFromViewMessageIds);
		next.delete(messageId);
		this.removedFromViewMessageIds = next;
	}

	private applyMoveAwayCounts(
		messages: MessagePreview[],
		sourceRouteId: string | null,
		target?: Mailbox
	) {
		if (!messages.length) return;

		const important = this.importantMailbox();
		for (const message of messages) {
			const unreadDelta = message.unread ? 1 : 0;
			const seen = new Set<string>();

			const decrement = (routeId: string, deltaUnread = 0) => {
				if (!routeId || seen.has(routeId)) return;
				seen.add(routeId);
				this.adjustMailboxCounts(routeId, -1, deltaUnread);
			};

			decrement(message.mailboxId, unreadDelta);
			if (sourceRouteId) decrement(sourceRouteId);
			if (important && (message.important || message.mailboxId === important.id)) {
				decrement(important.id);
			}
		}

		if (target) {
			const unreadInTarget = messages.filter((message) => message.unread).length;
			this.adjustMailboxCounts(target.id, messages.length, unreadInTarget);
		}
	}

	private applyMoveRestoreCounts(messages: MessagePreview[], sourceRouteId: string) {
		if (!messages.length) return;

		const important = this.importantMailbox();
		for (const message of messages) {
			const unreadDelta = message.unread ? 1 : 0;
			const seen = new Set<string>();

			const increment = (routeId: string, deltaUnread = 0) => {
				if (!routeId || seen.has(routeId)) return;
				seen.add(routeId);
				this.adjustMailboxCounts(routeId, 1, deltaUnread);
			};

			increment(sourceRouteId, unreadDelta);
			if (message.mailboxId !== sourceRouteId) increment(message.mailboxId);
			if (important && (message.important || message.mailboxId === important.id)) {
				increment(important.id);
			}
		}
	}

	restoreMessage(message: MessagePreview) {
		if (this.messages.some((m) => m.id === message.id)) return;

		this.clearRemovedFromView(message.id);
		this.messages = [...this.messages, message].sort(
			(a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
		);
		this.messagesTotal += 1;
		this.adjustMailboxCounts(message.mailboxId, 1);
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
		targetJmapId: string;
		message: string;
	}) {
		const snapshots = params.snapshots.map((message) => ({ ...message }));
		toast.showMoveUndo(params.message, async () => {
			try {
				await params.client.moveEmailsToMailbox(
					snapshots.map((message) => message.id),
					params.sourceJmapId,
					params.targetJmapId
				);
				const target = this.mailboxes.find((mb) => mb.jmapId === params.targetJmapId);
				if (target) {
					const unreadInTarget = snapshots.filter((message) => message.unread).length;
					this.adjustMailboxCounts(target.id, -snapshots.length, -unreadInTarget);
				}
				if (this.currentMailboxRouteId === params.sourceRouteId) {
					this.applyMoveRestoreCounts(snapshots, params.sourceRouteId);
					for (const message of snapshots) {
						this.clearRemovedFromView(message.id);
						if (!this.messages.some((item) => item.id === message.id)) {
							this.messages = [...this.messages, message].sort(
								(a, b) =>
									new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
							);
							this.messagesTotal += 1;
						}
					}
				}
			} catch (error) {
				toast.show(error instanceof Error ? error.message : 'Undo failed', 'error');
			}
		});
	}

	private adjustUnreadCount(routeId: string, delta: number) {
		this.adjustMailboxCounts(routeId, 0, delta);
	}

	private adjustMailboxCounts(routeId: string, totalDelta: number, unreadDelta = 0) {
		if (totalDelta === 0 && unreadDelta === 0) return;
		if (totalDelta !== 0 || unreadDelta !== 0) {
			this.blockMailboxRefreshUntil = Date.now() + 8000;
		}
		this.mailboxes = this.mailboxes.map((mb) =>
			mb.id === routeId
				? {
						...mb,
						total: Math.max(0, mb.total + totalDelta),
						unread: Math.max(0, mb.unread + unreadDelta)
					}
				: mb
		);
		if (unreadDelta !== 0) applyUnreadPrefixToDocument();
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
		this.openMessageGeneration++;
		this.openMessageInflight = null;
		this.openMessageInflightKey = null;
		this.clearSelection();
		this.selectionList = [];
		this.removedFromViewMessageIds = new Set();
		this.pendingKeywords.clear();
		this.messagesSyncRevision = 0;
	}
}

export const mail = new MailStore();
