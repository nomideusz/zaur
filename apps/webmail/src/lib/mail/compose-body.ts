/** Quoted original message appended to replies/forwards ("\n\n---\n…"). */
const QUOTE_MARKER = /\n\n---\n[\s\S]*$/;

/**
 * Signature block under the RFC 3676 "-- " delimiter line. The signature is
 * seeded into the body when composing starts and sent exactly as displayed —
 * deleting it in the editor removes it from that message.
 */
const SIGNATURE_BLOCK = /(?:^|\n)-- ?\n[\s\S]*$/;

export const SIGNATURE_DELIMITER = '-- \n';

export function stripQuotedReply(body: string): string {
	return body.replace(QUOTE_MARKER, '');
}

/** True when the body has no content besides the signature block and quote. */
export function isComposeBodyEmpty(body: string): boolean {
	return !stripQuotedReply(body).replace(SIGNATURE_BLOCK, '').trim();
}
