import type { MessageDetail } from '$lib/types/mail';

export function readerSenderLabel(
	message: MessageDetail,
	mailboxRouteId: string,
	isMe: (email: string) => boolean
): string {
	if (
		isMe(message.from.email) &&
		mailboxRouteId !== 'inbox' &&
		message.to &&
		message.to.length > 0
	) {
		const recipient = message.to[0];
		return `To ${recipient.name?.trim() || recipient.email}`;
	}
	const name = message.from.name?.trim();
	const email = message.from.email;
	if (!name || name === email) return email;
	return name;
}

/** Hide the secondary email line when the primary label already shows that address. */
export function shouldShowContactEmail(displayName: string, email: string): boolean {
	const normalizedEmail = email.trim();
	const normalizedDisplay = displayName.trim();
	if (!normalizedEmail) return false;

	const emailLower = normalizedEmail.toLowerCase();
	const displayLower = normalizedDisplay.toLowerCase();

	if (displayLower === emailLower) return false;
	if (displayLower === `to ${emailLower}`) return false;
	if (displayLower === `to: ${emailLower}`) return false;

	return true;
}

export interface ReaderPrimaryContact {
	name: string | undefined;
	email: string;
	displayName: string;
	isMe: boolean;
}

export function readerPrimaryContact(
	message: MessageDetail,
	mailboxRouteId: string,
	isMe: (email: string) => boolean
): ReaderPrimaryContact {
	const fromIsMe = isMe(message.from.email);
	if (fromIsMe && mailboxRouteId !== 'inbox' && message.to && message.to.length > 0) {
		const recipient = message.to[0];
		const name = recipient.name?.trim() || recipient.email;
		return {
			name,
			email: recipient.email,
			displayName: `To ${name}`,
			isMe: isMe(recipient.email)
		};
	}
	const displayName = readerSenderLabel(message, mailboxRouteId, isMe);
	return {
		name: message.from.name,
		email: message.from.email,
		displayName,
		isMe: fromIsMe
	};
}
