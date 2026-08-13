import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { error, type RequestHandler } from '@sveltejs/kit';
import { galeneConfigFromEnv, galeneDisplayName, mintJoinUrl } from '$lib/server/galene';
import { log } from '$lib/server/log';
import { checkRateLimit, getClientAddress } from '$lib/server/rate-limit';
import { readSession } from '$lib/server/session';
import { isMeetGroupId } from '$lib/utils/meet';

export const GET: RequestHandler = async ({ params, cookies, request }) => {
	const group = String(params.group ?? '').trim();
	if (!isMeetGroupId(group)) {
		error(400, 'Invalid meeting link');
	}

	const config = galeneConfigFromEnv(env, publicEnv);
	if (!config) {
		error(503, 'Video calls are not configured');
	}

	const clientAddress = getClientAddress(request);
	const limit = checkRateLimit({
		key: `meet-join:${clientAddress}`,
		limit: 60,
		windowMs: 15 * 60 * 1000
	});
	if (!limit.allowed) {
		error(429, `Too many join attempts. Try again in ${limit.retryAfterSec}s.`);
	}

	const account = readSession(cookies);
	try {
		const joinUrl = await mintJoinUrl(config, group, {
			username: account ? galeneDisplayName(account) : undefined,
			operator: Boolean(account)
		});
		return new Response(null, {
			status: 302,
			headers: {
				Location: joinUrl,
				'Cache-Control': 'no-store'
			}
		});
	} catch (err) {
		log.error('meet_join_failed', { group }, err);
		error(502, 'Could not start the video call');
	}
};
