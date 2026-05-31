export type MailboxRole =
	| 'inbox'
	| 'drafts'
	| 'sent'
	| 'junk'
	| 'trash'
	| 'archive'
	| 'important'
	| 'scheduled'
	| 'memos'
	| 'snoozed'
	| 'custom';

export interface Mailbox {
	id: string;
	jmapId?: string;
	name: string;
	role?: MailboxRole;
	unread: number;
	total: number;
	parentId?: string;
}

export interface MessagePreview {
	id: string;
	threadId: string;
	mailboxId: string;
	from: { name: string; email: string };
	to?: { name: string; email: string }[];
	subject: string;
	preview: string;
	receivedAt: string;
	unread: boolean;
	starred: boolean;
	important: boolean;
	hasAttachment: boolean;
}

export interface MessageDetail extends MessagePreview {
	to: { name: string; email: string }[];
	cc: { name: string; email: string }[];
	bcc: { name: string; email: string }[];
	bodyHtml?: string;
	bodyText: string;
	attachments: MessageAttachment[];
}

export interface MessageAttachment {
	blobId: string;
	name: string;
	type: string;
	size: number;
}
