import type { MailboxKind } from '@zaur/mail-core';

export type MailboxDTO = {
	id: string;
	name: string;
	role: string | null;
	kind: MailboxKind;
	unread: number;
	total: number;
	primary: boolean;
};

export type ThreadListDTO = {
	mailboxId: string;
	rows: import('@zaur/mail-core').MessagePreview[];
};
