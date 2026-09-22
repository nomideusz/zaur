import { error } from '@sveltejs/kit';
import { query, command } from '$app/server';
import {
	isPrimarySidebarMailbox,
	mapEmailDetail,
	mapEmailPreview,
	mailboxKindOrder,
	resolveMailboxKind
} from '@zaur/mail-core';
import type { MailboxKind, MessageDetail, MessagePreview } from '@zaur/mail-core';
import { categoryKeyword } from '@zaur/mail-core';
import { getAccountPrefs, getStoreDb } from '@zaur/server-auth';
import type { MailboxDTO, ThreadListDTO } from '#lib/mail/types';
import { connect, requireAccount, requireAccountKey } from '#lib/server/account';
import { categorizeInBackground } from '#lib/server/categorize';

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

export const mailboxes = query(async (): Promise<MailboxDTO[]> => {
	const client = await connect();
	const list = await client.getMailboxes();
	return list
		.map((m): MailboxDTO => {
			const kind = resolveMailboxKind({ name: m.name, role: m.role ?? null });
			return {
				id: m.id,
				name: m.name,
				role: m.role ?? null,
				kind,
				unread: m.unreadEmails ?? 0,
				total: m.totalEmails ?? 0,
				primary: isPrimarySidebarMailbox(kind)
			};
		})
		.sort(
			(a, b) =>
				mailboxKindOrder(a.kind) - mailboxKindOrder(b.kind) || a.name.localeCompare(b.name)
		);
});

/** The list header's filter: everything, only unseen, only what you flagged, or one category. */
export type ListFilter = 'all' | 'unseen' | 'flagged' | `cat:${string}`;

/** Folders whose mail is worth categorising: what arrived, not what you sent or threw away. */
const CATEGORIZED_KINDS: (MailboxKind | null | undefined)[] = ['inbox', 'archive', 'important', 'custom'];

function aiCategoriesOn(): boolean {
	try {
		return !!JSON.parse(getAccountPrefs(getStoreDb(), requireAccountKey()) ?? '{}').aiCategories;
	} catch {
		return false;
	}
}

export const threads = query(
	schema<{ mailboxId: string; filter?: ListFilter; limit?: number; kind?: MailboxKind }>(),
	async ({ mailboxId, filter, limit, kind }): Promise<ThreadListDTO> => {
		const client = await connect();
		const { emails } = await client.queryEmails(
			mailboxId,
			Math.min(500, Math.max(1, Number(limit) || 50)),
			0,
			{
				unseenOnly: filter === 'unseen',
				flaggedOnly: filter === 'flagged',
				keyword: filter?.startsWith('cat:') ? categoryKeyword(filter.slice(4)) : undefined
			}
		);
		if (CATEGORIZED_KINDS.includes(kind) && aiCategoriesOn()) categorizeInBackground(client, emails);
		return {
			mailboxId,
			rows: emails.map((email) => mapEmailPreview(email, mailboxId))
		};
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
			rows: emails.map((email) => mapEmailPreview(email, mailboxId ?? ''))
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
