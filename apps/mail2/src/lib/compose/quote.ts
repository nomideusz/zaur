import type { MessageDetail } from '@zaur/mail-core';
import { attachmentFromServer } from './attachments';
import type { DraftSeed } from './types';

export interface Seed {
	subject: string;
	body: string;
}

/** 24-hour by default, like every other time in Mail, whatever the browser's locale. */
export function formatWhen(iso: string, locale = 'en-GB'): string {
	return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
		new Date(iso)
	);
}

export function replySubject(subject: string): string {
	return subject.startsWith('Re:') ? subject : `Re: ${subject}`;
}

export function forwardSubject(subject: string): string {
	return subject.startsWith('Fwd:') ? subject : `Fwd: ${subject}`;
}

/**
 * Reopen a server draft: chips from the stored recipients, body as written,
 * file attachments reattached by blobId. Inline images stay out — a plain-text
 * draft has no cid references, so they would resurface as duplicate files.
 */
export function draftSeed(message: MessageDetail): DraftSeed {
	return {
		jmapDraftId: message.id,
		from: message.from.email,
		to: message.to.map((person) => ({ name: person.name, email: person.email, meta: '' })),
		// Chips, so a reopened draft keeps the names its recipients arrived with.
		cc: message.cc.map((person) => ({ name: person.name, email: person.email, meta: '' })),
		bcc: message.bcc.map((person) => ({ name: person.name, email: person.email, meta: '' })),
		subject: message.subject,
		body: message.bodyText,
		bodyHtml: message.bodyHtml ?? '',
		attachments: message.attachments
			.filter((part) => part.disposition !== 'inline')
			.map((part) => attachmentFromServer(part))
	};
}

/** The conventional "-- " delimiter keeps a signature out of quoting clients' replies. */
export function signatureBlock(signature: string | undefined): string {
	const text = signature?.trim();
	return text ? `\n\n-- \n${text}` : '';
}

/** Under what is written, over what is quoted (a reply or forward seed starts "\n\n---\n"). */
export function withSignature(body: string, block: string): string {
	return body.startsWith('\n\n---\n') ? block + body : body + block;
}

/** Same quote shape webmail 1.0 uses for plain-text replies (`\n\n---\n` marker). */
export function replySeed(message: MessageDetail, locale?: string): Seed {
	const when = formatWhen(message.receivedAt, locale);
	const who = message.from.name || message.from.email;
	return {
		subject: replySubject(message.subject),
		body: `\n\n---\nOn ${when}, ${who} wrote:\n${message.bodyText}`
	};
}

/**
 * Reply-all recipients, taken from the message being answered and nothing
 * earlier: its sender and the people it was addressed to go in To, its Cc
 * stays Cc. Whoever was dropped from the conversation along the way stays
 * dropped. My own addresses are left out — except that a message I sent goes
 * back to the people I sent it to. Deduped case-insensitively, To before Cc.
 */
export function replyAllRecipients(
	message: MessageDetail,
	myEmails: Set<string>
): { to: { name: string; email: string }[]; cc: { name: string; email: string }[] } {
	const seen = new Set<string>();
	const isMe = (email: string) => myEmails.has(email.trim().toLowerCase());
	const others = (people: { name: string; email: string }[]) =>
		people.flatMap((person) => {
			const key = person.email.trim().toLowerCase();
			if (!key || isMe(key) || seen.has(key)) return [];
			seen.add(key);
			return [{ name: person.name, email: person.email }];
		});
	const to = others([message.from, ...message.to]);
	const cc = others(message.cc);
	// A note to myself has nobody else in it: answer it where it came from.
	return to.length || cc.length ? { to, cc } : { to: [message.from], cc };
}

export function forwardSeed(message: MessageDetail, locale?: string): Seed {
	const when = formatWhen(message.receivedAt, locale);
	const toLine = message.to.map((addr) => addr.name || addr.email).join(', ');
	return {
		subject: forwardSubject(message.subject),
		body:
			`\n\n---\nForwarded message:\n` +
			`From: ${message.from.name || message.from.email} <${message.from.email}>\n` +
			`Date: ${when}\n` +
			`Subject: ${message.subject}\n` +
			`To: ${toLine}\n\n` +
			message.bodyText
	};
}
