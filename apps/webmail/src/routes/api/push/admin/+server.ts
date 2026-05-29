import { json, type RequestHandler } from '@sveltejs/kit';
import {
	assertPushAdmin,
	getPushAdminStatus,
	sendTestPushNotifications
} from '$lib/server/push-admin';

export const GET: RequestHandler = async ({ request }) => {
	assertPushAdmin(request);
	return json(await getPushAdminStatus());
};

export const POST: RequestHandler = async ({ request }) => {
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
