import type { MailboxKind } from '@zaur/mail-core';

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
