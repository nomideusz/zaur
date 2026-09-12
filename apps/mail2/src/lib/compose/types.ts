export interface Recipient {
	name: string;
	email: string;
	meta: string;
}

export type DraftStage = 'default' | 'maximized' | 'minimized';

export type FocusTarget = 'to' | 'subject' | 'body' | null;

export interface ComposeContact {
	name: string;
	email: string;
	meta: string;
}

export type AttachmentStatus = 'uploading' | 'ready' | 'error';

export interface DraftAttachment {
	id: string;
	name: string;
	/** MIME type; never empty. */
	type: string;
	/** Bytes — reported by the upload response. */
	size: number;
	/** JMAP blob id once uploaded. */
	blobId: string | null;
	status: AttachmentStatus;
}

/** Wire shape for send/save — mirrors mail-core's EmailAttachmentInput. */
export interface OutgoingAttachment {
	blobId: string;
	name: string;
	type: string;
	size: number;
}

export interface PanelRect {
	x: number;
	y: number;
	w: number;
	h: number;
}

export interface Draft {
	id: string;
	to: Recipient[];
	toInput: string;
	toOpen: boolean;
	toHi: number;
	cc: string;
	bcc: string;
	ccOpen: boolean;
	bccOpen: boolean;
	subject: string;
	body: string;
	attachments: DraftAttachment[];
	scheduled: boolean;
	bodyOpened: boolean;
	stage: DraftStage;
	x: number;
	y: number;
	w: number;
	h: number;
	saved: PanelRect | null;
	auto: boolean;
	gesture: boolean;
	z: number;
	focusTarget: FocusTarget;
	sending: boolean;
	sendError: string | null;
	/** Server email id of the persisted copy in the Drafts mailbox. */
	jmapDraftId: string | null;
	draftSaving: boolean;
	draftSavedAt: number | null;
}

export type ReplyMode = 'reply' | 'replyAll' | 'forward';

export interface SendPayload {
	to: string[];
	cc: string[];
	bcc: string[];
	subject: string;
	body: string;
	sendAt?: string;
	attachments?: OutgoingAttachment[];
}

/** Everything needed to reopen a server draft in a panel. */
export interface DraftSeed {
	jmapDraftId: string | null;
	to: Recipient[];
	cc: string;
	bcc: string;
	subject: string;
	body: string;
	attachments: DraftAttachment[];
}

export interface DraftSaveInput {
	jmapDraftId: string | null;
	to: string[];
	cc: string[];
	bcc: string[];
	subject: string;
	body: string;
	attachments: OutgoingAttachment[];
}

export interface ComposeTransport {
	send(payload: SendPayload): Promise<{ ok: true; emailId?: string }>;
	cancelScheduled(emailId: string): Promise<unknown>;
	uploadAttachment(file: File): Promise<OutgoingAttachment>;
	saveDraft(input: DraftSaveInput): Promise<{ emailId: string }>;
	deleteDraft(emailId: string): Promise<unknown>;
}
