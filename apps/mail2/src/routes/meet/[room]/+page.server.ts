import { error } from '@sveltejs/kit';
import { checkRateLimitRow, getActiveAccount, getStoreDb, readSessionFull } from '@zaur/server-auth';
import { isMeetGroupId } from '@zaur/mail-core/utils/meet';
import { getClientAddress } from '#lib/server/login';
import { meetConfig, meetDisplayName, participantNames } from '#lib/server/meet';
import type { PageServerLoad } from './$types';

/**
 * The lobby: who you would join as, and who is already in. Outside the (app)
 * gate on purpose — a guest with the link has no account. The token itself is
 * minted by `joinCall` once the lobby is done.
 */
export const load: PageServerLoad = async ({ params, cookies, request }) => {
	if (!isMeetGroupId(params.room)) error(404, 'This meeting link is not valid');
	const config = meetConfig();
	if (!config) error(503, 'Video calls are not set up on this server');

	const limit = checkRateLimitRow(getStoreDb(), `mail2-meet-lobby:${getClientAddress(request)}`, 120, 15 * 60_000);
	if (!limit.allowed) error(429, `Too many requests. Try again in ${limit.retryAfterSec}s.`);

	const session = readSessionFull(cookies);
	const account = session ? getActiveAccount(session) : undefined;
	// ponytail: a snapshot at page load; poll it if people wait in the lobby for long.
	const here = await participantNames(config, params.room);
	return {
		room: params.room,
		you: account ? { name: meetDisplayName(account), email: account.username } : null,
		here
	};
};
