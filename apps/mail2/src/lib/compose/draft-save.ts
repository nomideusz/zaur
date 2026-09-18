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
	'attachments'
]);

/** The server draft stores addresses, so the three chip lists unwrap here. */
export function buildDraftSaveInput(draft: Draft): DraftSaveInput {
	return {
		jmapDraftId: draft.jmapDraftId,
		to: recipientEmails(draft.to),
		cc: recipientEmails(draft.cc),
		bcc: recipientEmails(draft.bcc),
		subject: draft.subject,
		body: draft.body,
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
		input.to,
		input.cc,
		input.bcc,
		input.subject,
		input.body,
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
		draft.body.trim().length > 0 ||
		draft.attachments.length > 0
	);
}
