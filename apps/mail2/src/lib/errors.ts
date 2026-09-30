/**
 * What a failed remote call has to say. A server `error(400, …)` reaches the
 * client as an HttpError, which is not an `Error`: its text is in `body.message`.
 */
export function messageOf(cause: unknown, fallback: string): string {
	if (cause && typeof cause === 'object' && 'body' in cause) {
		const body = (cause as { body?: { message?: string } }).body;
		// Kit's stock text for an unexpected 500 tells a person nothing; the caller's fallback does.
		if (body?.message && body.message !== 'Internal Error') return body.message;
	}
	return cause instanceof Error && cause.message ? cause.message : fallback;
}
