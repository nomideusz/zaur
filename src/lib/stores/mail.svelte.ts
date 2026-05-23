import type { JMAPClient } from '$lib/jmap/client';
import type { JMAPMailbox } from '$lib/jmap/types';
import type { Mailbox } from '$lib/types/mail';

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
	isLoading = $state(false);
	error = $state<string | null>(null);

	async loadMailboxes(client: JMAPClient) {
		this.isLoading = true;
		this.error = null;
		try {
			const list = await client.getMailboxes();
			this.mailboxes = list.map(mapMailbox).sort(sortMailboxes);
		} catch (error) {
			this.error = error instanceof Error ? error.message : 'Failed to load folders';
			this.mailboxes = [];
		} finally {
			this.isLoading = false;
		}
	}

	mailboxByRouteId(routeId: string): Mailbox | undefined {
		return (
			this.mailboxes.find((mb) => mb.id === routeId) ??
			this.mailboxes.find((mb) => mb.jmapId === routeId)
		);
	}

	reset() {
		this.mailboxes = [];
		this.isLoading = false;
		this.error = null;
	}
}

export const mail = new MailStore();
