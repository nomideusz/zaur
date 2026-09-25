import { error } from '@sveltejs/kit';
import { query, command } from '$app/server';
import {
	isPrimarySidebarMailbox,
	mapEmailDetail,
	mapEmailPreview,
	mailboxKindOrder,
	resolveMailboxKind
} from '@zaur/mail-core';
import type { JMAPClient, MailboxKind, MessageDetail, MessagePreview } from '@zaur/mail-core';
import { getAccountPrefs, getStoreDb } from '@zaur/server-auth';
import type { MailboxDTO, ThreadListDTO } from '#lib/mail/types';
import { connect, refuse, requireAccount, requireAccountKey } from '#lib/server/account';
import { categorizeInBackground } from '#lib/server/categorize';
import { LABEL_FILTERS, filterKeyword, type ListFilter } from '#lib/mail/labels';
import { treeOrder } from '#lib/mail/folders';
import { WEBMAIL_SETTINGS_SUBJECT } from '#lib/server/webmail-import';

function schema<T>() {
	return {
		'~standard': {
			version: 1,
			vendor: 'zaur',
			validate(value: unknown) {
				return { value: value as T };
			}
		}
	} as any;
}

/**
 * Stalwart leaves a scheduled message in Scheduled after it has gone out;
 * filing it to Sent is the client's job. At most once a minute per account, in
 * the background — the push that follows the move refreshes the counts.
 */
const reconciledAt = new Map<string, number>();

export const mailboxes = query(async (): Promise<MailboxDTO[]> => {
	const client = await connect();
	const key = requireAccountKey();
	if (Date.now() - (reconciledAt.get(key) ?? 0) > 60_000) {
		reconciledAt.set(key, Date.now());
		client.reconcileScheduledEmails().catch(() => {});
	}
	const list = await client.getMailboxes();
	const sorted = list
		.map((m): Omit<MailboxDTO, 'depth'> => {
			const kind = resolveMailboxKind({ name: m.name, role: m.role ?? null });
			return {
				id: m.id,
				name: m.name,
				role: m.role ?? null,
				kind,
				unread: m.unreadEmails ?? 0,
				total: m.totalEmails ?? 0,
				primary: isPrimarySidebarMailbox(kind),
				parentId: m.parentId ?? null
			};
		})
		.sort(
			(a, b) =>
				mailboxKindOrder(a.kind) - mailboxKindOrder(b.kind) || a.name.localeCompare(b.name)
		);
	return treeOrder(sorted);
});

function folderName(raw: unknown): string {
	const name = String(raw ?? '').trim();
	if (!name) error(400, 'Name the folder');
	if (name.length > 100) error(400, 'That name is too long');
	return name;
}

/** Inbox, Sent, Trash and the rest are the server's: only your own folders change. */
async function ownFolder(client: JMAPClient, id: unknown): Promise<string> {
	const [mailbox] = await client.getMailboxesByIds([String(id)]);
	if (!mailbox) error(404, 'No such folder');
	if (mailbox.role) error(400, `${mailbox.name} can't be changed`);
	return mailbox.id;
}

export const createFolder = command(
	schema<{ name: string; parentId?: string | null }>(),
	async ({ name, parentId }): Promise<{ id: string }> => {
		const client = await connect();
		const id = await client
			.createMailbox(folderName(name), parentId ? String(parentId) : null)
			.catch(refuse);
		await mailboxes().refresh();
		return { id };
	}
);

/** Rename a folder and/or move it under another (`parentId: null` for the top level). */
export const updateFolder = command(
	schema<{ id: string; name: string; parentId: string | null }>(),
	async ({ id, name, parentId }): Promise<{ ok: true }> => {
		const client = await connect();
		await client
			.updateMailbox(await ownFolder(client, id), {
				name: folderName(name),
				parentId: parentId ? String(parentId) : null
			})
			.catch(refuse);
		await mailboxes().refresh();
		return { ok: true };
	}
);

/** Delete a folder and the mail that lives only in it — the caller has asked. */
export const deleteFolder = command(
	schema<{ id: string }>(),
	async ({ id }): Promise<{ ok: true }> => {
		const client = await connect();
		await client.destroyMailbox(await ownFolder(client, id), true).catch(refuse);
		await mailboxes().refresh();
		return { ok: true };
	}
);

export type { ListFilter };

/** Folders whose mail is worth categorising: what arrived, not what you sent or threw away. */
const CATEGORIZED_KINDS: (MailboxKind | null | undefined)[] = ['inbox', 'archive', 'important', 'custom'];

function aiCategoriesOn(): boolean {
	try {
		return !!JSON.parse(getAccountPrefs(getStoreDb(), requireAccountKey()) ?? '{}').aiCategories;
	} catch {
		return false;
	}
}

/** Webmail 1.0 keeps its settings in a message with this subject; it is not mail. */
const isMail = (email: { subject?: string | null }) => email.subject?.trim() !== WEBMAIL_SETTINGS_SUBJECT;

export const threads = query(
	schema<{ mailboxId: string; filter?: ListFilter; limit?: number; kind?: MailboxKind }>(),
	async ({ mailboxId, filter, limit, kind }): Promise<ThreadListDTO> => {
		const client = await connect();
		const { emails } = await client.queryEmails(
			mailboxId,
			Math.min(500, Math.max(1, Number(limit) || 50)),
			0,
			{ unseenOnly: filter === 'unseen', keyword: filterKeyword(filter) }
		);
		if (CATEGORIZED_KINDS.includes(kind) && aiCategoriesOn()) categorizeInBackground(client, emails);
		return {
			mailboxId,
			rows: emails.filter(isMail).map((email) => mapEmailPreview(email, mailboxId))
		};
	}
);

/**
 * Unseen mail under each label in one folder — the sidebar's counts, the same
 * number a folder row shows, in one round trip of `Email/query` totals.
 */
export const labelCounts = query(
	schema<{ mailboxId: string }>(),
	async ({ mailboxId }): Promise<Record<string, number>> => {
		const client = await connect();
		const response = await client.request(
			LABEL_FILTERS.map((filter, index) => [
				'Email/query',
				{
					accountId: client.getAccountId(),
					filter: { inMailbox: mailboxId, notKeyword: '$seen', hasKeyword: filterKeyword(filter) },
					limit: 1,
					calculateTotal: true
				},
				`c${index}`
			])
		);
		return Object.fromEntries(
			LABEL_FILTERS.map((filter, index) => [
				filter,
				Number(response.methodResponses?.[index]?.[1]?.total) || 0
			])
		);
	}
);

/**
 * Search across the account, or inside one folder.
 *
 * The query language is `parseSearchQuery` in `@zaur/mail-core` — the same
 * parser webmail 1.0 uses, so `from:` / `subject:` / `has:attachment` /
 * `is:unseen` / `before:` mean the same thing in both clients. It was already
 * in the shared package; it just was not exported from its index.
 *
 * `mailboxId` scopes the search and comes back on the DTO, which is what lets
 * the list group and open results exactly like a folder view.
 */
export const search = query(
	schema<{ query: string; mailboxId?: string; limit?: number }>(),
	async ({ query: text, mailboxId, limit }): Promise<ThreadListDTO> => {
		const trimmed = (text ?? '').trim();
		if (!trimmed) return { mailboxId: mailboxId ?? '', rows: [] };
		const client = await connect();
		const { emails } = await client.searchEmails(
			trimmed,
			Math.min(500, Math.max(1, Number(limit) || 50)),
			0,
			mailboxId
		);
		return {
			mailboxId: mailboxId ?? '',
			// Results can come from any folder, so a row is labelled by the
			// mailbox it is actually in rather than the one we searched from.
			rows: emails.filter(isMail).map((email) => mapEmailPreview(email, mailboxId ?? ''))
		};
	}
);

export const thread = query(
	schema<{ threadId: string }>(),
	async ({ threadId }): Promise<MessageDetail[]> => {
		const client = await connect();
		const emails = await client.getThreadEmails(threadId);
		return emails
			.map((email) => mapEmailDetail(email, ''))
			.sort((a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime());
	}
);

export const quota = query(async () => {
	const client = await connect();
	return client.getStorageQuota();
});

export type BulkAction = 'read' | 'unread' | 'star' | 'unstar' | 'move' | 'delete';

/**
 * One command for every list-selection action — they all boil down to an
 * Email/set over a batch of ids, so a single round trip beats five endpoints.
 * `move` needs the destination; `sourceMailboxId` unfiles from the current
 * folder (omit it to file into the destination without removing anything).
 */
export interface BulkInput {
	action: BulkAction;
	emailIds: string[];
	mailboxId?: string;
	sourceMailboxId?: string;
}

export const bulk = command(
	schema<BulkInput>(),
	async ({ action, emailIds, mailboxId, sourceMailboxId }: BulkInput): Promise<{ count: number }> => {
		const ids = [...new Set((emailIds ?? []).map(String).filter(Boolean))];
		if (ids.length === 0) return { count: 0 };
		if (ids.length > 500) error(400, 'Too many messages selected');

		const client = await connect();
		switch (action) {
			case 'read':
			case 'unread':
				await client.markManyAsRead(ids, action === 'read');
				break;
			case 'star':
			case 'unstar':
				await client.toggleStar(ids, action === 'star');
				break;
			case 'move':
				if (!mailboxId) error(400, 'No destination folder');
				await client.moveEmailsToMailbox(ids, mailboxId, sourceMailboxId);
				break;
			case 'delete':
				await client.destroyEmails(ids);
				break;
			default:
				error(400, 'Unknown action');
		}
		return { count: ids.length };
	}
);
