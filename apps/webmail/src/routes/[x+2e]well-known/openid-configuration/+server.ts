import { error, json, type RequestHandler } from '@sveltejs/kit';
import { oidcProviderEnabled } from '$lib/server/oidc';
import { discoveryDocument } from '$lib/server/oidc/core';

export const GET: RequestHandler = ({ url }) => {
	if (!oidcProviderEnabled()) error(404, 'Not found');
	return json(discoveryDocument(url.origin));
};
