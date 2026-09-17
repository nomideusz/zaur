import { error } from '@sveltejs/kit';
import { command } from '$app/server';
import { accountKey } from '@zaur/server-auth';
import { connect, requireAccount } from '#lib/server/account';

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

export interface OutgoingAttachmentDTO {
	blobId: string;
	name: string;
	type: string;
	size: number;
}

export interface SendInput {
	to: string[];
	cc?: string[];
	bcc?: string[];
	subject: string;
	body: string;
	/** UTC ISO time for delayed delivery; omit for an immediate send. */
	sendAt?: string;
	attachments?: OutgoingAttachmentDTO[];
	/** The account that wrote it; a message is never sent from a different one. */
	account?: string;
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

const MAX_ATTACHMENTS = 10;
const MAX_TOTAL_ATTACHMENT_BYTES = 25 * 1024 * 1024;

/** Keep only well-formed, reasonably sized attachment descriptors. */
function sanitizeAttachments(list: OutgoingAttachmentDTO[] | undefined): OutgoingAttachmentDTO[] {
	const out: OutgoingAttachmentDTO[] = [];
	let total = 0;
	for (const raw of list ?? []) {
		if (!raw || typeof raw !== 'object') continue;
		const blobId = typeof raw.blobId === 'string' ? raw.blobId.trim() : '';
		if (!blobId || blobId.length > 512) continue;
		const name = String(raw.name ?? 'attachment').slice(0, 255);
		const type = String(raw.type ?? 'application/octet-stream').slice(0, 255);
		const size = Number.isFinite(raw.size) ? Math.max(0, Math.round(raw.size)) : 0;
		total += size;
		if (total > MAX_TOTAL_ATTACHMENT_BYTES) error(400, 'Attachments exceed the 25 MB limit');
		out.push({ blobId, name, type, size });
		if (out.length >= MAX_ATTACHMENTS) break;
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
	// After an account switch (in this tab or another), a queued or open draft must
	// not go out under the address that happens to be active now.
	if (input.account && accountKey(requireAccount().username) !== input.account) {
		error(409, `Written as ${input.account}; switch to that account to send it`);
	}
	const client = await connect();
	let emailId: string | undefined;
	await client.sendEmail(to, input.subject ?? '', input.body ?? '', {
		cc: cc.length ? cc : undefined,
		bcc: bcc.length ? bcc : undefined,
		format: 'plain',
		sendAt: input.sendAt,
		attachments: sanitizeAttachments(input.attachments),
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

export interface DraftSavePayload {
	/** Server email id of the previously saved copy, for updates. */
	jmapDraftId?: string | null;
	to?: string[];
	cc?: string[];
	bcc?: string[];
	subject?: string;
	body?: string;
	attachments?: OutgoingAttachmentDTO[];
}

export const saveDraft = command(
	schema<DraftSavePayload>(),
	async (input: DraftSavePayload): Promise<{ emailId: string }> => {
		const to = cleanRecipients(input.to);
		const cc = cleanRecipients(input.cc);
		const bcc = cleanRecipients(input.bcc);
		const subject = String(input.subject ?? '');
		const body = String(input.body ?? '');
		const attachments = sanitizeAttachments(input.attachments);
		const hasContent =
			to.length > 0 ||
			cc.length > 0 ||
			bcc.length > 0 ||
			subject.trim().length > 0 ||
			body.trim().length > 0 ||
			attachments.length > 0;
		if (!hasContent) error(400, 'Empty draft');

		const client = await connect();
		const emailId = await client.saveDraft({
			jmapDraftId: input.jmapDraftId || undefined,
			to,
			cc: cc.length ? cc : undefined,
			bcc: bcc.length ? bcc : undefined,
			subject,
			body,
			fromEmail: client.getUsername(),
			attachments: attachments.length ? attachments : undefined,
			format: 'plain'
		});
		return { emailId };
	}
);

export const deleteDraft = command(
	schema<{ emailId: string }>(),
	async ({ emailId }: { emailId: string }): Promise<{ ok: true }> => {
		const client = await connect();
		await client.destroyEmail(String(emailId));
		return { ok: true };
	}
);
