import { error, json, type RequestHandler } from '@sveltejs/kit';
import { discoveryDocument } from '@zaur/server-auth/oidc';
import { oidcClients } from '#lib/server/oidc';

export const GET: RequestHandler = ({ url }) => {
	if (!oidcClients().length) error(404, 'Not found');
	return json(discoveryDocument(url.origin));
};
