import { parseAddressList } from './recipients';
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

/** The server draft stores parsed recipients, so cc/bcc strings are split here. */
export function buildDraftSaveInput(draft: Draft): DraftSaveInput {
	const seen = new Set<string>();
	const to: string[] = [];
	for (const recipient of draft.to) {
		const email = recipient.email.trim();
		if (!email) continue;
		const key = email.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		to.push(email);
	}
	return {
		jmapDraftId: draft.jmapDraftId,
		to,
		cc: parseAddressList(draft.cc),
		bcc: parseAddressList(draft.bcc),
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
		draft.cc.trim().length > 0 ||
		draft.bcc.trim().length > 0 ||
		draft.subject.trim().length > 0 ||
		draft.body.trim().length > 0 ||
		draft.attachments.length > 0
	);
}
