/**
 * Verifies register → webmail server-to-server calls. Mirrors register's
 * `requireInternalWebmail` scheme exactly (shared secret, 5-minute window,
 * signature over timestamp.nonce.METHOD.path+query.sha256(body)) so the two
 * apps can call each other with one secret and one convention.
 * ponytail: no nonce store — the signed window is 5 min and every call here
 * yields a single-use token, so a replay only re-mints one for the same holder.
 */
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const INTERNAL_SIGNATURE_WINDOW_MS = 5 * 60 * 1000;

export interface InternalSignatureInput {
	secret: string | undefined;
	timestamp: string;
	nonce: string;
	method: string;
	pathWithQuery: string;
	body: string;
	signature: string;
	now?: number;
}

export function signInternalPayload(
	secret: string,
	timestamp: string,
	nonce: string,
	method: string,
	pathWithQuery: string,
	body: string
): string {
	const bodyHash = createHash('sha256').update(body).digest('hex');
	return createHmac('sha256', secret)
		.update(`${timestamp}.${nonce}.${method}.${pathWithQuery}.${bodyHash}`)
		.digest('hex');
}

export function verifyInternalSignature(input: InternalSignatureInput): boolean {
	const secret = input.secret?.trim();
	const ts = Number(input.timestamp);
	if (!secret || !/^[A-Za-z0-9_-]{16,64}$/.test(input.nonce) || !Number.isFinite(ts)) return false;
	if (Math.abs((input.now ?? Date.now()) - ts) > INTERNAL_SIGNATURE_WINDOW_MS) return false;
	const expected = signInternalPayload(secret, input.timestamp, input.nonce, input.method, input.pathWithQuery, input.body);
	const a = createHash('sha256').update(String(input.signature)).digest();
	const b = createHash('sha256').update(expected).digest();
	return timingSafeEqual(a, b);
}

/** Only same-origin relative paths may be used as post-login destinations. */
export function safeNextPath(next: unknown): string | undefined {
	if (typeof next !== 'string' || next.length > 2048) return undefined;
	return next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : undefined;
}

/** Signup handoff: a sealed SessionData parked behind a one-time claim token. */
export const HANDOFF_TTL_MS = 10 * 60_000;
export interface HandoffPayload {
	sealed: string;
	next?: string;
}
