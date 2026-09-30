import type { MailboxKind, MessageDetail } from '@zaur/mail-core';

/** A message of an open conversation, with the folders it is filed in: an action on the conversation takes those in the open folder. */
export type ThreadMessageDTO = MessageDetail & { mailboxIds: string[] };

export type MailboxDTO = {
	id: string;
	name: string;
	role: string | null;
	kind: MailboxKind;
	unread: number;
	total: number;
	primary: boolean;
	parentId: string | null;
	/** Nesting level, 0 for top-level; the list comes parents-first. */
	depth: number;
};

export type ThreadListDTO = {
	mailboxId: string;
	rows: import('@zaur/mail-core').MessagePreview[];
	/** There is older mail than the list holds: "Load more" asks for a longer list. */
	hasMore?: boolean;
};

/** A mailbox someone shares with you: their JMAP account, and the folders you see. */
export type SharedMailboxDTO = {
	id: string;
	/** What the server calls the account — the owner's address, on Stalwart. */
	name: string;
	mailboxes: MailboxDTO[];
};
