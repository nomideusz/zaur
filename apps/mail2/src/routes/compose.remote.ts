import { error } from '@sveltejs/kit';
import { command, getRequestEvent } from '$app/server';
import { getActiveAccount, readSessionFull } from '@zaur/server-auth';
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

function requireAccount() {
	const { cookies } = getRequestEvent();
	const session = readSessionFull(cookies);
	const account = session ? getActiveAccount(session) : undefined;
	if (!account) error(401, 'Unauthorized');
	return account;
}

async function connect() {
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

export interface SendInput {
	to: string[];
	cc?: string[];
	bcc?: string[];
	subject: string;
	body: string;
	/** UTC ISO time for delayed delivery; omit for an immediate send. */
	sendAt?: string;
}

export interface SendResult {
	ok: true;
	/** Server email id — lets the client undo a scheduled send. */
	emailId?: string;
}

function cleanRecipients(list: string[] | undefined): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const raw of list ?? []) {
		const email = String(raw).trim();
		if (!email || !email.includes('@')) continue;
		const key = email.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(email);
	}
	return out;
}

export const send = command(schema<SendInput>(), async (input: SendInput): Promise<SendResult> => {
	const to = cleanRecipients(input.to);
	const cc = cleanRecipients(input.cc);
	const bcc = cleanRecipients(input.bcc);
	if (to.length === 0 && cc.length === 0 && bcc.length === 0) {
		error(400, 'No recipients');
	}
	const client = await connect();
	let emailId: string | undefined;
	await client.sendEmail(to, input.subject ?? '', input.body ?? '', {
		cc: cc.length ? cc : undefined,
		bcc: bcc.length ? bcc : undefined,
		format: 'plain',
		sendAt: input.sendAt,
		onEmailCreated: (id) => {
			emailId = id;
		}
	});
	return { ok: true, emailId };
});

export const cancelScheduled = command(
	schema<{ emailId: string }>(),
	async ({ emailId }: { emailId: string }): Promise<{ ok: true }> => {
		const client = await connect();
		await client.cancelScheduledSend(emailId);
		return { ok: true };
	}
);
