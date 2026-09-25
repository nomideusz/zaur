/**
 * Joining a Zaur Meet call: a LiveKit token for one room. Signed in, you join
 * as your account; otherwise as a guest under the name you typed. Rate limited
 * per address with webmail 1.0's budget, since a token needs no session.
 */
import * as v from 'valibot';
import { randomUUID } from 'node:crypto';
import { error } from '@sveltejs/kit';
import { command, getRequestEvent, query } from '$app/server';
import { checkRateLimitRow, getActiveAccount, getStoreDb, readSessionFull } from '@zaur/server-auth';
import { MEET_GROUP_RE } from '@zaur/mail-core/utils/meet';
import { getClientAddress } from '#lib/server/login';
import { GUEST_PREFIX, cleanName, meetConfig, meetDisplayName, mintJoinToken, participantNames } from '#lib/server/meet';
import { reportError } from '#lib/server/report';

export interface CallTicket {
	wsUrl: string;
	token: string;
	identity: string;
	name: string;
}

export const joinCall = command(
	v.object({
		room: v.pipe(v.string(), v.regex(MEET_GROUP_RE)),
		name: v.optional(v.pipe(v.string(), v.maxLength(200)))
	}),
	async ({ room, name }): Promise<CallTicket> => {
		const config = meetConfig();
		if (!config) error(503, 'Video calls are not set up on this server');

		const { cookies, request } = getRequestEvent();
		const limit = checkRateLimitRow(getStoreDb(), `mail2-meet-join:${getClientAddress(request)}`, 60, 15 * 60_000);
		if (!limit.allowed) error(429, `Too many join attempts. Try again in ${limit.retryAfterSec}s.`);

		const session = readSessionFull(cookies);
		const account = session ? getActiveAccount(session) : undefined;
		const identity = account ? account.username : `${GUEST_PREFIX}${randomUUID()}`;
		const shown = account ? meetDisplayName(account) : cleanName(name ?? '');
		if (!shown) error(400, 'Enter your name to join.');

		try {
			const token = await mintJoinToken(config, { room, identity, name: shown });
			return { wsUrl: config.wsUrl, token, identity, name: shown };
		} catch (cause) {
			reportError(cause, { method: 'joinCall', url: `/meet/${room}` });
			error(502, 'Could not start the video call');
		}
	}
);

/**
 * Who is in the room now: the lobby asks again while you wait, as openly as
 * it loaded (`participantNames`). Its own budget, roomy enough for a poll
 * every ten seconds from a few tabs behind one address.
 */
export const whoIsHere = query(v.pipe(v.string(), v.regex(MEET_GROUP_RE)), async (room): Promise<string[]> => {
	const config = meetConfig();
	if (!config) return [];
	const { request } = getRequestEvent();
	const limit = checkRateLimitRow(getStoreDb(), `mail2-meet-here:${getClientAddress(request)}`, 360, 15 * 60_000);
	if (!limit.allowed) error(429, `Too many requests. Try again in ${limit.retryAfterSec}s.`);
	return participantNames(config, room);
});
