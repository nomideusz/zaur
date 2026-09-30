/**
 * A request that got no answer from the app, in the words of whoever noticed:
 * the browser (Chromium, WebKit, Firefox), or the proxy in front of a server
 * that is down (its status text — the app's own 502s carry their own sentence).
 */
const NO_ANSWER = /^(Failed to fetch|Load failed|NetworkError|Bad Gateway|Service Unavailable|Gateway Time-?out)/i;

/**
 * What a failed remote call has to say. A server `error(400, …)` reaches the
 * client as an HttpError, which is not an `Error`: its text is in `body.message`.
 *
 * A call that never reached the app says which of the two it was — no
 * connection here, or a server that is not answering — and then the caller's
 * own words for what did not happen, never "Failed to fetch".
 */
export function messageOf(cause: unknown, fallback: string, online = globalThis.navigator?.onLine !== false): string {
	const said =
		cause && typeof cause === 'object' && 'body' in cause
			? ((cause as { body?: { message?: string } }).body?.message ?? '')
			: cause instanceof Error
				? cause.message
				: '';
	if (NO_ANSWER.test(said)) {
		return `${online ? "Can't reach the server" : "You're offline"} — ${fallback.charAt(0).toLowerCase()}${fallback.slice(1)}`;
	}
	// Kit's stock text for an unexpected 500, or a bare status line from whatever
	// answered instead, tells a person nothing; the caller's fallback does.
	return said && !/^Internal (Server )?Error$/i.test(said) ? said : fallback;
}

/**
 * A part of the app's own code that could not be fetched: a section opened for
 * the first time with the connection (or the server) gone. Chromium, WebKit
 * and Firefox each have their own words for it, and Vite has some for the
 * stylesheet that comes with it.
 */
const CODE_NOT_LOADED =
	/Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS/i;

export function codeNotLoaded(cause: unknown): boolean {
	return CODE_NOT_LOADED.test(cause instanceof Error ? cause.message : typeof cause === 'string' ? cause : '');
}
