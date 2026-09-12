import { error } from '@sveltejs/kit';
import { query, getRequestEvent } from '$app/server';
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
	schema<{ mailboxId: string; unseenOnly?: boolean }>(),
	async ({ mailboxId, unseenOnly }): Promise<ThreadListDTO> => {
		const client = await connect();
		const { emails } = await client.queryEmails(mailboxId, 50, 0, { unseenOnly });
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
