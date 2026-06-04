import { extractInlineImages, rewriteInlineCidImages } from '$lib/email/inline-images';
import type { JMAPEmail, JMAPBodyPart } from '$lib/jmap/types';
import type { Mailbox, MessageAttachment, MessageDetail, MessagePreview } from '$lib/types/mail';

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

export function extractBodyText(email: JMAPEmail): string {
	if (email.bodyValues) {
		const textPartId = email.textBody?.[0]?.partId;
		if (textPartId && email.bodyValues[textPartId]?.value) {
			return email.bodyValues[textPartId].value;
		}
		const htmlPartId = email.htmlBody?.[0]?.partId;
		if (htmlPartId && email.bodyValues[htmlPartId]?.value) {
			return stripHtml(email.bodyValues[htmlPartId].value);
		}
	}
	return email.preview?.trim() ?? '';
}

export function extractBodyHtml(email: JMAPEmail): string | undefined {
	const htmlPartId = email.htmlBody?.[0]?.partId;
	if (htmlPartId && email.bodyValues?.[htmlPartId]?.value) {
		return email.bodyValues[htmlPartId].value;
	}
	return undefined;
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
			return;
		}

		const isAttachment =
			part.disposition === 'attachment' ||
			(!!part.name &&
				!!part.blobId &&
				part.type !== 'text/plain' &&
				part.type !== 'text/html');

		if (isAttachment && part.blobId && part.name) {
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
