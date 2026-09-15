import { error } from '@sveltejs/kit';
import { query, command, getRequestEvent } from '$app/server';
import { getActiveAccount, readSessionFull, type SessionData } from '@zaur/server-auth';
import {
	JMAPClient,
	isPrimarySidebarMailbox,
	mapEmailDetail,
	mapEmailPreview,
	mailboxKindOrder,
	resolveMailboxKind
} from '@zaur/mail-core';
import type { MailboxKind, MessageDetail, MessagePreview } from '@zaur/mail-core';
import type { MailboxDTO, ThreadListDTO } from '#lib/mail/types';
import { createConnectedClient } from '#lib/server/jmap';

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

function requireAccount(): SessionData {
	const { cookies } = getRequestEvent();
	const session = readSessionFull(cookies);
	const account = session ? getActiveAccount(session) : undefined;
	if (!account) error(401, 'Unauthorized');
	return account;
}

async function connect(): Promise<JMAPClient> {
	const account = requireAccount();
	try {
		return await createConnectedClient(account);
	} catch (cause) {
		if (cause instanceof Error && cause.message === 'Unauthorized') {
			error(401, 'Unauthorized');
		}
		throw cause;
	}
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

export const threads = query(
	schema<{ mailboxId: string; unseenOnly?: boolean; limit?: number }>(),
	async ({ mailboxId, unseenOnly, limit }): Promise<ThreadListDTO> => {
		const client = await connect();
		const { emails } = await client.queryEmails(
			mailboxId,
			Math.min(500, Math.max(1, Number(limit) || 50)),
			0,
			{ unseenOnly }
		);
		return {
			mailboxId,
			rows: emails.map((email) => mapEmailPreview(email, mailboxId)),
			syncedAt: new Date().toISOString()
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
				await Promise.all(ids.map((id) => client.toggleStar(id, action === 'star')));
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
