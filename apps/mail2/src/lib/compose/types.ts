export interface Recipient {
	name: string;
	email: string;
	meta: string;
}

export type DraftStage = 'default' | 'maximized' | 'minimized';

/**
 * What the panel was opened as. The window header names a draft by its subject,
 * because several can be open at once and the subject is what tells them apart;
 * a phone sheet has the subject in a field two rows down, so its bar says this
 * instead.
 */
export type DraftKind = 'new' | 'reply' | 'replyAll' | 'forward' | 'draft';

export type FocusTarget = 'to' | 'subject' | 'body' | null;

/** The three address fields. They are the same field three times over. */
export type RecipientField = 'to' | 'cc' | 'bcc';

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
	kind: DraftKind;
	/**
	 * The three address fields, each a chip list with its own typing state:
	 * what is half-typed (`Input`), whether its suggestion list is up (`Open`),
	 * and which suggestion is highlighted (`Hi`). Cc and Bcc used to be plain
	 * comma-separated strings, which meant no completion, no validation until
	 * send, and no way to correct one address out of four.
	 */
	to: Recipient[];
	toInput: string;
	toOpen: boolean;
	toHi: number;
	cc: Recipient[];
	ccInput: string;
	ccOpen: boolean;
	ccHi: number;
	bcc: Recipient[];
	bccInput: string;
	bccOpen: boolean;
	bccHi: number;
	/** Whether the Cc / Bcc rows are on screen at all — both start hidden. */
	ccShown: boolean;
	bccShown: boolean;
	subject: string;
	/** The plain-text reading of the message: the text/plain part, and what compose reasons about. */
	body: string;
	/** What the editor holds. Empty until something is written — a seed is only text. */
	bodyHtml: string;
	/** Written in a plain textarea and sent as text/plain only; `bodyHtml` stays empty. */
	plain: boolean;
	attachments: DraftAttachment[];
	/** UTC ISO for a delayed send, or null to send immediately. Ephemeral — not persisted. */
	sendAt: string | null;
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
	bodyHtml?: string;
	sendAt?: string;
	attachments?: OutgoingAttachment[];
	/**
	 * The account that wrote it (its lowercased address). A message waiting in the
	 * outbox is only ever sent from that account; the server refuses anything else.
	 */
	account?: string;
}

/** Everything needed to reopen a server draft in a panel. */
export interface DraftSeed {
	jmapDraftId: string | null;
	to: Recipient[];
	cc: Recipient[];
	bcc: Recipient[];
	subject: string;
	body: string;
	bodyHtml: string;
	attachments: DraftAttachment[];
}

export interface DraftSaveInput {
	jmapDraftId: string | null;
	to: string[];
	cc: string[];
	bcc: string[];
	subject: string;
	body: string;
	bodyHtml: string;
	attachments: OutgoingAttachment[];
}

export interface ComposeTransport {
	/** The signed-in account's key, or null while the session is still loading. */
	readonly account: string | null;
	send(payload: SendPayload): Promise<{ ok: true; emailId?: string }>;
	cancelScheduled(emailId: string): Promise<unknown>;
	uploadAttachment(file: File): Promise<OutgoingAttachment>;
	saveDraft(input: DraftSaveInput): Promise<{ emailId: string }>;
	deleteDraft(emailId: string): Promise<unknown>;
}
