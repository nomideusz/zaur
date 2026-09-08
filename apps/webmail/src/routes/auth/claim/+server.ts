import { createHash } from 'node:crypto';
import { redirect, type RequestHandler } from '@sveltejs/kit';
import { consumeOneTimeCode } from '$lib/server/oidc/core';
import { recordSessionDevice, unsealSession, writeSession, type SessionData } from '$lib/server/session';
import { getStoreDb } from '$lib/server/store-instance';
import { getClientAddress } from '$lib/server/rate-limit';
import type { HandoffPayload } from '$lib/server/internal-auth';

/* Second half of the signup handoff: turn the one-time token minted by
 * /api/internal/handoff into a session cookie, then continue to `next` (the
 * OIDC authorize URL when signup started in another app) or the inbox. */
export const GET: RequestHandler = ({ url, cookies, request }) => {
	const token = url.searchParams.get('token') ?? '';
	const payload = token ? consumeOneTimeCode<HandoffPayload>(getStoreDb(), token) : null;
	const data = payload ? (unsealSession(payload.sealed) as SessionData | null) : null;
	if (!data) redirect(303, '/login');

	writeSession(cookies, data, { remember: false });
	recordSessionDevice(
		cookies,
		request.headers.get('user-agent'),
		createHash('sha256').update(getClientAddress(request)).digest('base64url').slice(0, 16)
	);
	redirect(303, payload?.next ?? '/');
};
