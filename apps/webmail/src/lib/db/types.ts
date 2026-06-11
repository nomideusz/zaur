import type { ComposeMode } from '$lib/stores/compose.svelte';

export interface DraftDoc {
	id: string;
	accountId: string;
	to: string;
	cc: string;
	bcc: string;
	subject: string;
	body: string;
	bodyHtml?: string;
	mode: ComposeMode;
	jmapDraftId?: string;
	attachmentsJson?: string;
	updatedAt: number;
	createdAt: number;
}

export type OutboxStatus = 'pending' | 'sending' | 'failed';

export interface OutboxDoc {
	id: string;
	accountId: string;
	to: string;
	cc: string;
	bcc: string;
	subject: string;
	body: string;
	bodyHtml?: string;
	format?: string;
	fromEmail: string;
	fromName?: string;
	attachmentsJson?: string;
	/** Server id of the created outgoing email; set once phase 1 of the send succeeds. */
	jmapEmailId?: string;
	status: OutboxStatus;
	error?: string;
	attempts: number;
	createdAt: number;
	updatedAt: number;
}

export interface RecentThreadDoc {
	id: string;
	accountId: string;
	mailboxRouteId: string;
	threadId: string;
	emailId: string;
	fromName: string;
	fromEmail: string;
	subject: string;
	preview: string;
	receivedAt: string;
	unread: boolean;
	starred: boolean;
	important?: boolean;
	hasAttachment: boolean;
	replied?: boolean;
	cachedAt: number;
}

export type SyncStateType = 'Email' | 'Mailbox' | 'Thread';

export interface SyncStateDoc {
	id: string;
	accountId: string;
	type: SyncStateType;
	state: string;
	updatedAt: number;
}

export interface ThreadCacheDoc {
	id: string;
	accountId: string;
	threadId: string;
	mailboxRouteId: string;
	messagesJson: string;
	cachedAt: number;
}

export interface AttachmentBlobDoc {
	id: string;
	accountId: string;
	blobId: string;
	name: string;
	type: string;
	size: number;
	dataBase64: string;
	cachedAt: number;
}
