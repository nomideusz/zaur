import { json, type RequestHandler } from '@sveltejs/kit';
import {
	assertPushAdmin,
	getPushAdminStatus,
	sendTestPushNotifications
} from '$lib/server/push-admin';
import { checkRateLimit, getClientAddress } from '$lib/server/rate-limit';

function adminRateLimitResponse(request: Request): Response | null {
	const limit = checkRateLimit({
		key: `push-admin:${getClientAddress(request)}`,
		limit: 30,
		windowMs: 60 * 1000
	});
	if (!limit.allowed) {
		return json(
			{ error: 'Too many requests' },
			{ status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } }
		);
	}
	return null;
}

export const GET: RequestHandler = async ({ request }) => {
	const limited = adminRateLimitResponse(request);
	if (limited) return limited;
	assertPushAdmin(request);
	return json(await getPushAdminStatus());
};

export const POST: RequestHandler = async ({ request }) => {
	const limited = adminRateLimitResponse(request);
	if (limited) return limited;
	assertPushAdmin(request);

	let body: { id?: string; title?: string; body?: string } = {};
	try {
		const raw = await request.text();
		if (raw.trim()) body = JSON.parse(raw) as typeof body;
	} catch {
		return json({ error: 'Invalid request body' }, { status: 400 });
	}

	return json(await sendTestPushNotifications(body));
};
