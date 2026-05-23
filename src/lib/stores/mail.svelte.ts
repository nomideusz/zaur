import type { JMAPClient } from '$lib/jmap/client';
import { mapEmailDetail, mapEmailPreview } from '$lib/jmap/map';
import type { JMAPMailbox } from '$lib/jmap/types';
import type { Mailbox, MessageDetail, MessagePreview } from '$lib/types/mail';

const PAGE_SIZE = 50;

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
	currentMailboxRouteId = $state<string | null>(null);

	selectedMessage = $state<MessageDetail | null>(null);
	selectedLoading = $state(false);
	selectedError = $state<string | null>(null);

	async loadMailboxes(client: JMAPClient) {
		this.mailboxesLoading = true;
		this.mailboxesError = null;
		try {
			const list = await client.getMailboxes();
			this.mailboxes = list.map(mapMailbox).sort(sortMailboxes);
		} catch (error) {
			this.mailboxesError = error instanceof Error ? error.message : 'Failed to load folders';
			this.mailboxes = [];
		} finally {
			this.mailboxesLoading = false;
		}
	}

	async loadMessages(client: JMAPClient, routeMailboxId: string) {
		const mailbox = this.mailboxByRouteId(routeMailboxId);
		if (!mailbox?.jmapId) {
			this.messages = [];
			this.messagesError = 'Folder not found';
			this.messagesHasMore = false;
			return;
		}

		this.currentMailboxRouteId = routeMailboxId;
		this.messagesLoading = true;
		this.messagesError = null;
		this.selectedMessage = null;
		this.selectedError = null;

		try {
			const { emails, total, hasMore } = await client.queryEmails(mailbox.jmapId, PAGE_SIZE, 0);
			this.messages = emails.map((email) => mapEmailPreview(email, routeMailboxId));
			this.messagesTotal = total;
			this.messagesHasMore = hasMore;
		} catch (error) {
			this.messages = [];
			this.messagesTotal = 0;
			this.messagesHasMore = false;
			this.messagesError = error instanceof Error ? error.message : 'Failed to load messages';
		} finally {
			this.messagesLoading = false;
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
			const previews = emails.map((email) => mapEmailPreview(email, routeMailboxId));
			this.messages = [...this.messages, ...previews];
			this.messagesHasMore = hasMore;
		} catch (error) {
			this.messagesError = error instanceof Error ? error.message : 'Failed to load more messages';
		} finally {
			this.messagesLoadingMore = false;
		}
	}

	async loadMessage(client: JMAPClient, routeMailboxId: string, threadId: string) {
		if (this.currentMailboxRouteId !== routeMailboxId || !this.messages.length) {
			await this.loadMessages(client, routeMailboxId);
		}

		const match = this.messages.find((m) => m.threadId === threadId);
		if (!match) {
			this.selectedMessage = null;
			this.selectedError = 'Message not found';
			return;
		}

		this.selectedLoading = true;
		this.selectedError = null;

		try {
			const email = await client.getEmail(match.id);
			if (!email) {
				this.selectedMessage = null;
				this.selectedError = 'Message not found';
				return;
			}
			this.selectedMessage = mapEmailDetail(email, routeMailboxId);

			if (this.selectedMessage.unread) {
				await this.markAsRead(client, this.selectedMessage, true);
			}
		} catch (error) {
			this.selectedMessage = null;
			this.selectedError = error instanceof Error ? error.message : 'Failed to load message';
		} finally {
			this.selectedLoading = false;
		}
	}

	async markAsRead(client: JMAPClient, message: MessagePreview, read: boolean) {
		const previousUnread = message.unread;
		this.patchMessage(message.id, { unread: !read });
		if (this.selectedMessage?.id === message.id) {
			this.selectedMessage = { ...this.selectedMessage, unread: !read };
		}
		if (previousUnread && read) {
			this.adjustUnreadCount(message.mailboxId, -1);
		} else if (!previousUnread && !read) {
			this.adjustUnreadCount(message.mailboxId, 1);
		}

		try {
			await client.markAsRead(message.id, read);
		} catch {
			this.patchMessage(message.id, { unread: previousUnread });
			if (this.selectedMessage?.id === message.id) {
				this.selectedMessage = { ...this.selectedMessage, unread: previousUnread };
			}
			if (previousUnread && read) {
				this.adjustUnreadCount(message.mailboxId, 1);
			} else if (!previousUnread && !read) {
				this.adjustUnreadCount(message.mailboxId, -1);
			}
		}
	}

	async toggleStar(client: JMAPClient, message: MessagePreview) {
		const next = !message.starred;
		this.patchMessage(message.id, { starred: next });
		if (this.selectedMessage?.id === message.id) {
			this.selectedMessage = { ...this.selectedMessage, starred: next };
		}

		try {
			await client.toggleStar(message.id, next);
		} catch {
			this.patchMessage(message.id, { starred: !next });
			if (this.selectedMessage?.id === message.id) {
				this.selectedMessage = { ...this.selectedMessage, starred: !next };
			}
		}
	}

	async moveMessage(client: JMAPClient, message: MessagePreview, targetRole: Mailbox['role']) {
		const target = this.mailboxes.find((mb) => mb.role === targetRole);
		if (!target?.jmapId) throw new Error(`${targetRole ?? 'target'} folder not found`);

		await client.moveToMailbox(message.id, target.jmapId);
		this.removeMessage(message);
	}

	async deleteMessage(client: JMAPClient, message: MessagePreview, routeMailboxId: string) {
		const trash = this.mailboxes.find((mb) => mb.role === 'trash');
		const currentMailbox = this.mailboxByRouteId(routeMailboxId);

		if (currentMailbox?.role === 'trash') {
			await client.destroyEmail(message.id);
		} else if (trash?.jmapId) {
			await client.moveToMailbox(message.id, trash.jmapId);
		} else {
			await client.destroyEmail(message.id);
		}

		this.removeMessage(message);
	}

	async handlePushChange(client: JMAPClient, accountChanges: { Email?: string; Mailbox?: string }) {
		if (accountChanges.Mailbox) {
			await this.loadMailboxes(client);
		}

		if (accountChanges.Email && this.currentMailboxRouteId) {
			const routeId = this.currentMailboxRouteId;
			const selectedId = this.selectedMessage?.id;
			await this.refreshMessages(client, routeId);

			if (selectedId) {
				const email = await client.getEmail(selectedId);
				if (email) {
					this.selectedMessage = mapEmailDetail(email, routeId);
				}
			}
		}
	}

	async refreshMessages(client: JMAPClient, routeMailboxId: string) {
		const mailbox = this.mailboxByRouteId(routeMailboxId);
		if (!mailbox?.jmapId) return;

		try {
			const { emails, total, hasMore } = await client.queryEmails(mailbox.jmapId, PAGE_SIZE, 0);
			this.messages = emails.map((email) => mapEmailPreview(email, routeMailboxId));
			this.messagesTotal = total;
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

	private patchMessage(id: string, patch: Partial<MessagePreview>) {
		this.messages = this.messages.map((m) => (m.id === id ? { ...m, ...patch } : m));
	}

	private removeMessage(message: MessagePreview) {
		if (message.unread) {
			this.adjustUnreadCount(message.mailboxId, -1);
		}
		this.messages = this.messages.filter((m) => m.id !== message.id);
		this.messagesTotal = Math.max(0, this.messagesTotal - 1);
		if (this.selectedMessage?.id === message.id) {
			this.selectedMessage = null;
		}
	}

	private adjustUnreadCount(routeId: string, delta: number) {
		this.mailboxes = this.mailboxes.map((mb) =>
			mb.id === routeId ? { ...mb, unread: Math.max(0, mb.unread + delta) } : mb
		);
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
		this.currentMailboxRouteId = null;
		this.selectedMessage = null;
		this.selectedLoading = false;
		this.selectedError = null;
	}
}

export const mail = new MailStore();
