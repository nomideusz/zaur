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

export interface DraftAttachment {
	kind: string;
	name: string;
	size: string;
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
}

export type ReplyMode = 'reply' | 'replyAll' | 'forward';

export interface SendPayload {
	to: string[];
	cc: string[];
	bcc: string[];
	subject: string;
	body: string;
	sendAt?: string;
}

export interface ComposeTransport {
	send(payload: SendPayload): Promise<{ ok: true; emailId?: string }>;
	cancelScheduled(emailId: string): Promise<unknown>;
}
