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
	cc?: { name: string; email: string }[];
	/** Only ever there on mail you sent. */
	bcc?: { name: string; email: string }[];
	subject: string;
	preview: string;
	receivedAt: string;
	unread: boolean;
	starred: boolean;
	important: boolean;
	hasAttachment: boolean;
	replied?: boolean;
	/** Content category id (`mail/categories.ts`), when something has classified it. */
	category?: string;
}

export interface MessageDetail extends MessagePreview {
	to: { name: string; email: string }[];
	cc: { name: string; email: string }[];
	bcc: { name: string; email: string }[];
	/** Where the sender asks for answers, when that is not the From address. */
	replyTo?: { name: string; email: string }[];
	/** The message's own Message-ID and its thread so far, without angle brackets: what a reply's headers are built from. */
	messageId?: string;
	inReplyTo?: string[];
	references?: string[];
	bodyHtml?: string;
	bodyText: string;
	attachments: MessageAttachment[];
}

export interface MessageAttachment {
	blobId: string;
	name: string;
	type: string;
	size: number;
	cid?: string;
	disposition?: string;
}
