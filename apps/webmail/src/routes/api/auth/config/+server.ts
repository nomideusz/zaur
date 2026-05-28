import { json, type RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export const GET: RequestHandler = async () => {
	return json({
		enabled: env.OAUTH_ENABLED === 'true',
		clientId: env.OAUTH_CLIENT_ID || 'webmail',
		issuerUrl: env.OAUTH_ISSUER_URL || ''
	});
};
