import type { MessageDetail } from '@zaur/mail-core';
import { attachmentFromServer } from './attachments';
import type { DraftSeed } from './types';

export interface Seed {
	subject: string;
	body: string;
}

export function formatWhen(iso: string, locale?: string): string {
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
 * Reply-all recipients: every from/to/cc across the thread except my own
 * addresses, deduped case-insensitively, in first-seen order.
 */
export function replyAllRecipients(
	thread: MessageDetail[],
	myEmails: Set<string>
): { name: string; email: string }[] {
	const out: { name: string; email: string }[] = [];
	const seen = new Set<string>();
	const isMe = (email: string) => myEmails.has(email.trim().toLowerCase());
	const push = (person: { name: string; email: string }) => {
		if (!person.email || isMe(person.email)) return;
		const key = person.email.toLowerCase();
		if (seen.has(key)) return;
		seen.add(key);
		out.push({ name: person.name, email: person.email });
	};
	for (const message of thread) {
		push(message.from);
		for (const person of message.to) push(person);
		for (const person of message.cc) push(person);
	}
	return out;
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
