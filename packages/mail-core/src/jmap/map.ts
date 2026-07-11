import { extractInlineImages, inlineImageName, rewriteInlineCidImages } from '../email/inline-images';
import type { JMAPEmail, JMAPBodyPart } from './types';
import type { Mailbox, MessageAttachment, MessageDetail, MessagePreview } from '../types/mail';

const ROLE_PRIORITY: Mailbox['role'][] = [
	'inbox',
	'important',
	'scheduled',
	'snoozed',
	'memos',
	'sent',
	'archive',
	'drafts',
	'junk',
	'trash'
];

function firstAddress(addrs?: { name?: string; email: string }[]) {
	const first = addrs?.[0];
	if (!first) return { name: 'Unknown', email: '' };
	return { name: first.name?.trim() || first.email, email: first.email };
}

function mapAddresses(addrs?: { name?: string; email: string }[]) {
	return (addrs ?? []).map((a) => ({
		name: a.name?.trim() || a.email,
		email: a.email
	}));
}

/**
 * RFC 8621 §4.1.4: textBody/htmlBody fall back to the other format's part when
 * a message has only one — htmlBody on a plain-text-only message contains the
 * text/plain part. Always check the part type, or plain text gets rendered as
 * HTML and its newlines collapse.
 */
function partValue(
	email: JMAPEmail,
	parts: { partId?: string; type?: string }[] | undefined,
	type: string
): string | undefined {
	for (const part of parts ?? []) {
		if (part.type !== type || !part.partId) continue;
		const value = email.bodyValues?.[part.partId]?.value;
		if (value) return value;
	}
	return undefined;
}

export function extractBodyText(email: JMAPEmail): string {
	const text =
		partValue(email, email.textBody, 'text/plain') ??
		partValue(email, email.htmlBody, 'text/plain');
	if (text) return text;

	const html =
		partValue(email, email.htmlBody, 'text/html') ??
		partValue(email, email.textBody, 'text/html');
	if (html) return stripHtml(html);

	return email.preview?.trim() ?? '';
}

export function extractBodyHtml(email: JMAPEmail): string | undefined {
	return partValue(email, email.htmlBody, 'text/html');
}

function stripHtml(html: string): string {
	return html
		.replace(/<style[\s\S]*?<\/style>/gi, '')
		.replace(/<script[\s\S]*?<\/script>/gi, '')
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

export function extractAttachments(bodyStructure?: JMAPBodyPart): MessageAttachment[] {
	if (!bodyStructure) return [];

	const attachments: MessageAttachment[] = [];

	function walk(part: JMAPBodyPart) {
		if (part.subParts?.length) {
			for (const sub of part.subParts) walk(sub);
		}

		if (!part.blobId || !part.type) return;

		if (part.type.startsWith('image/') && part.disposition === 'inline') {
			attachments.push({
				blobId: part.blobId,
				name: part.name?.trim() || inlineImageName(part),
				type: part.type,
				size: part.size ?? 0,
				...(part.cid ? { cid: part.cid.replace(/^<|>$/g, '') } : {}),
				disposition: 'inline'
			});
			return;
		}

		const isAttachment =
			part.disposition === 'attachment' ||
			(!!part.name &&
				part.type !== 'text/plain' &&
				part.type !== 'text/html');

		if (isAttachment && part.name) {
			attachments.push({
				blobId: part.blobId,
				name: part.name,
				type: part.type ?? 'application/octet-stream',
				size: part.size ?? 0
			});
		}
	}

	walk(bodyStructure);
	return attachments;
}

export function resolveRouteMailboxId(email: JMAPEmail, mailboxes: Mailbox[]): string {
	const jmapIds = Object.keys(email.mailboxIds ?? {});

	for (const role of ROLE_PRIORITY) {
		const mailbox = mailboxes.find((mb) => mb.role === role && mb.jmapId && jmapIds.includes(mb.jmapId));
		if (mailbox) return mailbox.id;
	}

	for (const mailbox of mailboxes) {
		if (mailbox.jmapId && jmapIds.includes(mailbox.jmapId)) return mailbox.id;
	}

	return mailboxes.find((mb) => mb.role === 'inbox')?.id ?? 'inbox';
}

export function mapEmailPreview(email: JMAPEmail, routeMailboxId: string): MessagePreview {
	return {
		id: email.id,
		threadId: email.threadId,
		mailboxId: routeMailboxId,
		from: firstAddress(email.from),
		to: mapAddresses(email.to),
		subject: email.subject?.trim() || '(no subject)',
		preview: email.preview?.trim() || '',
		receivedAt: email.receivedAt,
		unread: !email.keywords?.$seen,
		starred: !!email.keywords?.$flagged,
		important: !!email.keywords?.$important,
		hasAttachment: !!email.hasAttachment,
		replied: !!email.keywords?.$answered
	};
}

export function mapEmailDetail(email: JMAPEmail, routeMailboxId: string): MessageDetail {
	const inlineImages = extractInlineImages(email.bodyStructure);
	const rawHtml = extractBodyHtml(email);

	return {
		...mapEmailPreview(email, routeMailboxId),
		to: mapAddresses(email.to),
		cc: mapAddresses(email.cc),
		bcc: mapAddresses(email.bcc),
		bodyHtml: rawHtml ? rewriteInlineCidImages(rawHtml, inlineImages) : undefined,
		bodyText: extractBodyText(email),
		attachments: extractAttachments(email.bodyStructure)
	};
}
