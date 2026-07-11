import { json, type RequestHandler } from '@sveltejs/kit';
import { getVapidPublicKey, isPushConfigured } from '$lib/server/push-config';
import { isFcmConfigured } from '$lib/server/fcm';

export const GET: RequestHandler = async () => {
	const fcm = isFcmConfigured();
	if (!isPushConfigured()) {
		return json({ enabled: false, publicKey: null, fcm });
	}

	return json({ enabled: true, publicKey: getVapidPublicKey(), fcm });
};
