import { json, type RequestHandler } from '@sveltejs/kit';
import { getVapidPublicKey, isPushConfigured } from '$lib/server/push-config';

export const GET: RequestHandler = async () => {
	if (!isPushConfigured()) {
		return json({ enabled: false, publicKey: null });
	}

	return json({ enabled: true, publicKey: getVapidPublicKey() });
};
