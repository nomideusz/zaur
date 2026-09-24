import { recipientEmails } from './recipients';
import { outgoingAttachments } from './attachments';
import type { Draft, DraftSaveInput } from './types';

/**
 * Draft fields whose change must be persisted to the Drafts mailbox. Geometry
 * and transient typing state (toInput, popover flags) deliberately excluded —
 * autosave follows the content, not the cursor.
 */
export const DRAFT_CONTENT_KEYS: ReadonlySet<string> = new Set([
	'to',
	'cc',
	'bcc',
	'subject',
	'body',
	'bodyHtml',
	'attachments',
	'from'
]);

/** The server draft stores addresses, so the three chip lists unwrap here. */
export function buildDraftSaveInput(draft: DraftContent): DraftSaveInput {
	return {
		jmapDraftId: draft.jmapDraftId,
		from: draft.from,
		to: recipientEmails(draft.to),
		cc: recipientEmails(draft.cc),
		bcc: recipientEmails(draft.bcc),
		subject: draft.subject,
		body: draft.body,
		bodyHtml: draft.bodyHtml,
		attachments: outgoingAttachments(draft.attachments)
	};
}

/**
 * Content-only signature for autosave bookkeeping — deliberately excludes
 * jmapDraftId, which changes on every server save (create + destroy) and
 * would otherwise trigger an endless resave loop.
 */
export function draftContentSignature(draft: Draft): string {
	const input = buildDraftSaveInput(draft);
	return JSON.stringify([
		input.from,
		input.to,
		input.cc,
		input.bcc,
		input.subject,
		input.body,
		input.bodyHtml,
		input.attachments
	]);
}

/** An empty draft is not worth a server round-trip (or a Drafts entry). */
export function hasDraftContent(draft: Draft): boolean {
	return (
		draft.to.length > 0 ||
		draft.cc.length > 0 ||
		draft.bcc.length > 0 ||
		draft.subject.trim().length > 0 ||
		// A signature alone is not a draft.
		draft.body.replace(draft.signature, '').trim().length > 0 ||
		draft.attachments.length > 0
	);
}

/** The fields a draft needs to come back after a reload, as kept on this device. */
const LOCAL_KEYS = [
	'id',
	'kind',
	'from',
	'signature',
	'to',
	'cc',
	'bcc',
	'ccShown',
	'bccShown',
	'subject',
	'body',
	'bodyHtml',
	'plain',
	'attachments',
	'jmapDraftId'
] as const satisfies readonly (keyof Draft)[];

/** What a draft is, without its panel: enough to reopen or save it. */
export type DraftContent = Pick<Draft, (typeof LOCAL_KEYS)[number]>;

export interface LocalDraft {
	id: string;
	/** The account it was written in; it only comes back there. */
	account: string | null;
	/** Closed while the server could not take it: save it, don't reopen it. */
	closed: boolean;
	draft: DraftContent;
}

/**
 * The on-device copy of a draft the server has not confirmed yet. Plain data
 * (no proxies), and a chip still uploading comes back failed: its bytes die
 * with the page.
 */
export function localDraft(draft: Draft, account: string | null, closed: boolean): LocalDraft {
	const copy: DraftContent = JSON.parse(
		JSON.stringify(Object.fromEntries(LOCAL_KEYS.map((key) => [key, draft[key]])))
	);
	for (const chip of copy.attachments) if (chip.status === 'uploading') chip.status = 'error';
	return { id: draft.id, account, closed, draft: copy };
}
