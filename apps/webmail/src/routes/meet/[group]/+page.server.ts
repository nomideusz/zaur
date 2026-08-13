import { env } from '$env/dynamic/private';
import { error, fail } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { livekitConfigFromEnv, livekitDisplayName, mintJoinToken } from '$lib/server/livekit';
import { log } from '$lib/server/log';
import { checkRateLimit, getClientAddress } from '$lib/server/rate-limit';
import { readSession } from '$lib/server/session';
import { isMeetGroupId } from '$lib/utils/meet';
import type { Actions, PageServerLoad } from './$types';

function rateLimitOrThrow(request: Request): void {
	const clientAddress = getClientAddress(request);
	const limit = checkRateLimit({
		key: `meet-join:${clientAddress}`,
		limit: 60,
		windowMs: 15 * 60 * 1000
	});
	if (!limit.allowed) {
		error(429, `Too many join attempts. Try again in ${limit.retryAfterSec}s.`);
	}
}

async function joinPayload(
	group: string,
	identity: string,
	name: string
): Promise<{ group: string; wsUrl: string; token: string; name: string; needsName: false }> {
	const config = livekitConfigFromEnv(env);
	if (!config) error(503, 'Video calls are not configured');
	const token = await mintJoinToken(config, { room: group, identity, name });
	return { group, wsUrl: config.wsUrl, token, name, needsName: false };
}

export const load: PageServerLoad = async ({ params, cookies, request }) => {
	const group = String(params.group ?? '').trim();
	if (!isMeetGroupId(group)) error(400, 'Invalid meeting link');
	if (!livekitConfigFromEnv(env)) error(503, 'Video calls are not configured');

	rateLimitOrThrow(request);

	const account = readSession(cookies);
	if (!account) {
		return { group, needsName: true as const, wsUrl: '', token: '', name: '' };
	}

	try {
		return await joinPayload(group, account.username, livekitDisplayName(account));
	} catch (err) {
		log.error('meet_join_failed', { group }, err);
		error(502, 'Could not start the video call');
	}
};

export const actions: Actions = {
	default: async ({ params, request }) => {
		const group = String(params.group ?? '').trim();
		if (!isMeetGroupId(group)) error(400, 'Invalid meeting link');
		rateLimitOrThrow(request);

		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim().slice(0, 64);
		if (!name) return fail(400, { message: 'Enter your name to join.' });

		try {
			return await joinPayload(group, `guest-${randomUUID()}`, name);
		} catch (err) {
			log.error('meet_join_failed', { group }, err);
			error(502, 'Could not start the video call');
		}
	}
};
