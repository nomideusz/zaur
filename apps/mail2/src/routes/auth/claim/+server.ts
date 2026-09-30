import { createHash } from 'node:crypto';
import { error, redirect, type RequestHandler } from '@sveltejs/kit';
import { getStoreDb, recordSessionDevice, unsealSession, writeSession, type SessionData } from '@zaur/server-auth';
import { consumeOneTimeCode, isNavigation } from '@zaur/server-auth/oidc';
import type { HandoffPayload } from '@zaur/server-auth/internal-auth';
import { getClientAddress } from '#lib/server/login';

/* Second half of the signup handoff: the one-time token from
 * /api/internal/handoff becomes the session cookie, then on to `next` (the
 * OIDC authorize URL when signup began in another app) or the inbox. A used
 * or expired token is just a sign-in, with a welcome. */
export const GET: RequestHandler = ({ url, cookies, request }) => {
	// A sign-in by GET: only as a navigation, so nothing embedded in a page can swap the session.
	if (!isNavigation(request.headers)) error(400, 'Not a page navigation');
	const token = url.searchParams.get('token') ?? '';
	const payload = token ? consumeOneTimeCode<HandoffPayload>(getStoreDb(), token) : null;
	const data = payload ? (unsealSession(payload.sealed) as SessionData | null) : null;
	if (!data) redirect(303, '/login?welcome=1');

	writeSession(cookies, data, { remember: false });
	recordSessionDevice(
		cookies,
		request.headers.get('user-agent'),
		createHash('sha256').update(getClientAddress(request)).digest('base64url').slice(0, 16)
	);
	redirect(303, payload?.next ?? '/');
};
