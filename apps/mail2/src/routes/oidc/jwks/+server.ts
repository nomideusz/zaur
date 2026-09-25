import { error, json, type RequestHandler } from '@sveltejs/kit';
import { publicJwks } from '@zaur/server-auth/oidc';
import { oidcClients, oidcKeypair } from '#lib/server/oidc';

export const GET: RequestHandler = () => {
	if (!oidcClients().length) error(404, 'Not found');
	return json(publicJwks(oidcKeypair()));
};
