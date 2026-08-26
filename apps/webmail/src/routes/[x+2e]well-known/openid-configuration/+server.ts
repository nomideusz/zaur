import { error, json, type RequestHandler } from '@sveltejs/kit';
import { oidcProviderClient } from '$lib/server/oidc';
import { discoveryDocument } from '$lib/server/oidc/core';

export const GET: RequestHandler = ({ url }) => {
	if (!oidcProviderClient()) error(404, 'Not found');
	return json(discoveryDocument(url.origin));
};
