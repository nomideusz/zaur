import { error } from '@sveltejs/kit';
import { query, command } from '$app/server';
import {
	isJmapMethodError,
	isPrimarySidebarMailbox,
	mapEmailDetail,
	mapEmailPreview,
	mailboxKindOrder,
	resolveMailboxKind
} from '@zaur/mail-core';
import type {
	EmailQueryResult,
	JMAPClient,
	JMAPMailbox,
	JMAPMailboxRights,
	MailboxKind,
	MessageDetail,
	MessagePreview
} from '@zaur/mail-core';
import { getAccountPrefs, getStoreDb } from '@zaur/server-auth';
import type { MailboxDTO, SharedMailboxDTO, ThreadListDTO } from '#lib/mail/types';
import { connect, connectMail, refuse, requireAccount, requireAccountKey } from '#lib/server/account';
import { pickPrincipal } from '#lib/share';
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
	return folderList(await client.getMailboxes());
});

/**
 * Mailboxes other people share with you, each with its folders — the
 * sidebar's Shared group. A folder they did not share is not listed.
 */
export const sharedMailboxes = query(async (): Promise<SharedMailboxDTO[]> => {
	const client = await connect();
	return Promise.all(
		client.getSharedMailAccounts().map(async ({ id, name }) => ({
			id,
			name,
			mailboxes: folderList(await client.forAccount(id)!.getMailboxes())
		}))
	);
});

function folderList(list: JMAPMailbox[]): MailboxDTO[] {
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
}

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

/**
 * A list longer than one `Email/get` may return (Stalwart's default cap is
 * 500) comes in pages of that size, back to back. "Load more" asks for a
 * longer list rather than the next page, so every refresh stays one list.
 */
const GET_CAP = 500;
// ponytail: stops at 2000 rows; past that, search. Page by position in the client if folders get deeper.
const LIST_CAP = 2000;

async function listPages(
	limit: unknown,
	fetchPage: (limit: number, position: number) => Promise<EmailQueryResult>
): Promise<EmailQueryResult> {
	const want = Math.min(LIST_CAP, Math.max(1, Number(limit) || 50));
	const emails: EmailQueryResult['emails'] = [];
	let hasMore = false;
	for (let position = 0; position < want; position += GET_CAP) {
		const page = await fetchPage(Math.min(GET_CAP, want - position), position);
		emails.push(...page.emails);
		hasMore = page.hasMore && want < LIST_CAP;
		if (!page.hasMore) break;
	}
	return { emails, total: null, hasMore };
}

/** Webmail 1.0 keeps its settings in a message with this subject; it is not mail. */
const isMail = (email: { subject?: string | null }) => email.subject?.trim() !== WEBMAIL_SETTINGS_SUBJECT;

export const threads = query(
	schema<{ mailboxId: string; filter?: ListFilter; limit?: number; kind?: MailboxKind; account?: string | null }>(),
	async ({ mailboxId, filter, limit, kind, account }): Promise<ThreadListDTO> => {
		const client = await connectMail(account);
		const { emails, hasMore } = await listPages(limit, (limit, position) =>
			client.queryEmails(mailboxId, limit, position, {
				unseenOnly: filter === 'unseen',
				keyword: filterKeyword(filter)
			})
		);
		// Someone else's mailbox is not yours to label.
		if (!account && CATEGORIZED_KINDS.includes(kind) && aiCategoriesOn()) categorizeInBackground(client, emails);
		return {
			mailboxId,
			rows: emails.filter(isMail).map((email) => mapEmailPreview(email, mailboxId)),
			hasMore
		};
	}
);

/**
 * Unseen mail under each label in one folder — the sidebar's counts, the same
 * number a folder row shows, in one round trip of `Email/query` totals.
 */
export const labelCounts = query(
	schema<{ mailboxId: string; account?: string | null }>(),
	async ({ mailboxId, account }): Promise<Record<string, number>> => {
		const client = await connectMail(account);
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
 * the list group and open results exactly like a folder view. Without it the
 * search covers every folder.
 */
export const search = query(
	schema<{ query: string; mailboxId?: string; limit?: number; account?: string | null }>(),
	async ({ query: text, mailboxId, limit, account }): Promise<ThreadListDTO> => {
		const trimmed = (text ?? '').trim();
		if (!trimmed) return { mailboxId: mailboxId ?? '', rows: [] };
		const client = await connectMail(account);
		const { emails, hasMore } = await listPages(limit, (limit, position) =>
			client.searchEmails(trimmed, limit, position, mailboxId)
		);
		return {
			mailboxId: mailboxId ?? '',
			// Results can come from any folder, so a row is labelled by the
			// mailbox it is actually in rather than the one we searched from.
			rows: emails.filter(isMail).map((email) => mapEmailPreview(email, mailboxId ?? '')),
			hasMore
		};
	}
);

export const thread = query(
	schema<{ threadId: string; account?: string | null }>(),
	async ({ threadId, account }): Promise<MessageDetail[]> => {
		const client = await connectMail(account);
		const emails = await client.getThreadEmails(threadId);
		return emails
			.map((email) => mapEmailDetail(email, ''))
			// Inline images come through /api/jmap/download, which has to be told whose they are.
			.map((detail) =>
				account && detail.bodyHtml
					? {
							...detail,
							bodyHtml: detail.bodyHtml.replaceAll(
								'/api/jmap/download?',
								`/api/jmap/download?account=${encodeURIComponent(account)}&`
							)
						}
					: detail
			)
			.sort((a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime());
	}
);

export const quota = query(async () => {
	const client = await connect();
	return client.getStorageQuota();
});

export type BulkAction = 'read' | 'unread' | 'star' | 'unstar' | 'important' | 'unimportant' | 'move' | 'delete';

/**
 * One command for every list-selection action — they all boil down to an
 * Email/set over a batch of ids, so a single round trip beats five endpoints.
 * `move` needs the destination; `sourceMailboxId` unfiles from the current
 * folder (omit it to file into the destination without removing anything).
 *
 * A message that leaves its folder stops being sent: deleting or moving one
 * out of Scheduled cancels its pending submission first, or Stalwart would
 * still send it at its time from wherever it had been put.
 */
export interface BulkInput {
	action: BulkAction;
	emailIds: string[];
	mailboxId?: string;
	sourceMailboxId?: string;
	/** A mailbox shared with you; yours when absent. */
	account?: string | null;
}

export const bulk = command(
	schema<BulkInput>(),
	async ({ action, emailIds, mailboxId, sourceMailboxId, account }: BulkInput): Promise<{ count: number }> => {
		const ids = [...new Set((emailIds ?? []).map(String).filter(Boolean))];
		if (ids.length === 0) return { count: 0 };
		if (ids.length > 500) error(400, 'Too many messages selected');

		const client = await connectMail(account);
		// Only the owner sends from a mailbox, so only theirs has sends to cancel.
		const cancelSends = () => (account ? Promise.resolve(0) : client.cancelPendingSends(ids).catch(refuse));
		switch (action) {
			case 'read':
			case 'unread':
				await client.markManyAsRead(ids, action === 'read');
				break;
			case 'star':
			case 'unstar':
				await client.toggleStar(ids, action === 'star');
				break;
			case 'important':
			case 'unimportant': {
				// As in 1.0: an Important folder, where the server has one, holds them too.
				const folder = (await client.getMailboxes()).find(
					(m) => resolveMailboxKind({ name: m.name, role: m.role ?? null }) === 'important'
				);
				await client.toggleImportant(ids, action === 'important', folder?.id);
				break;
			}
			case 'move':
				if (!mailboxId) error(400, 'No destination folder');
				await cancelSends();
				await client.moveEmailsToMailbox(ids, mailboxId, sourceMailboxId);
				break;
			case 'delete':
				await cancelSends();
				await client.destroyEmails(ids);
				break;
			default:
				error(400, 'Unknown action');
		}
		return { count: ids.length };
	}
);

/** Trash and Spam can be emptied in one go; nothing else can. */
export const emptyFolder = command(
	schema<{ mailboxId: string; account?: string | null }>(),
	async ({ mailboxId, account }): Promise<{ count: number }> => {
		const client = await connectMail(account);
		const [mailbox] = await client.getMailboxesByIds([String(mailboxId)]);
		const kind = mailbox && resolveMailboxKind({ name: mailbox.name, role: mailbox.role ?? null });
		if (kind !== 'trash' && kind !== 'junk') error(400, 'Only Trash and Spam can be emptied');
		const count = await client.emptyMailbox(mailbox!.id).catch(refuse);
		await (account ? sharedMailboxes() : mailboxes()).refresh();
		return { count };
	}
);

/**
 * A forward out of a shared mailbox is sent from yours, and JMAP only
 * attaches blobs of the account that sends: its attachments are copied over
 * first. Returns old id → new id.
 */
export const copyAttachments = command(
	schema<{ account: string; blobIds: string[] }>(),
	async ({ account, blobIds }): Promise<Record<string, string>> => {
		const client = await connect();
		if (!client.forAccount(String(account))) error(404, 'That mailbox is not shared with you');
		const ids = [...new Set<string>((blobIds ?? []).map(String).filter(Boolean))].slice(0, 100);
		return client.copyBlobs(String(account), ids).catch(refuse);
	}
);

/**
 * Sharing your mailbox: what someone you share it with can do with it. They
 * read, file, flag and delete; they cannot rename or remove your folders, and
 * JMAP lets nobody but you send from it whatever this says.
 */
const SHARED_MAILBOX_RIGHTS: JMAPMailboxRights = {
	mayReadItems: true,
	mayAddItems: true,
	mayRemoveItems: true,
	maySetSeen: true,
	maySetKeywords: true,
	mayCreateChild: false,
	mayRename: false,
	mayDelete: false,
	maySubmit: false,
	mayShare: false
};

export type MailboxShareDTO = { id: string; name: string; email: string };

/** Who your mailbox is shared with: anyone any of your folders is shared with. */
export const mailboxSharing = query(async (): Promise<MailboxShareDTO[]> => {
	const client = await connect();
	if (!client.hasPrincipals()) return [];
	const ids = [...new Set((await client.getMailboxShares()).flatMap((box) => Object.keys(box.shareWith)))];
	const people = await client.getPrincipals(ids).catch(() => []);
	return ids.map((id) => {
		const person = people.find((one) => one.id === id);
		return { id, name: person?.name ?? '', email: person?.email ?? '' };
	});
});

/** Share every folder of your mailbox with a person, found by their address. */
export const shareMailbox = command(
	schema<{ email: string }>(),
	async ({ email }): Promise<{ name: string }> => {
		const client = await connect();
		if (!client.hasPrincipals()) error(400, 'This server does not offer sharing.');
		const typed = String(email ?? '').trim();
		if (!typed) error(400, 'Type their address');
		const matches = await client.queryPrincipals(typed).catch((cause) => {
			if (isJmapMethodError(cause, 'forbidden')) error(400, 'This server does not let you look people up. Ask your admin to open the directory.');
			throw cause;
		});
		const pick = pickPrincipal(matches, typed, client.getCurrentUserPrincipalId());
		if ('error' in pick) error(400, pick.error);
		await client.shareMailboxes(pick.person.id, SHARED_MAILBOX_RIGHTS).catch(refuse);
		await mailboxSharing().refresh();
		return { name: pick.person.name || pick.person.email || typed };
	}
);

/** Stop sharing your mailbox with someone. */
export const unshareMailbox = command(
	schema<{ principalId: string }>(),
	async ({ principalId }): Promise<void> => {
		const client = await connect();
		await client.shareMailboxes(String(principalId), null).catch(refuse);
		await mailboxSharing().refresh();
	}
);
