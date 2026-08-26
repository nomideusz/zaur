import { error, json, type RequestHandler } from '@sveltejs/kit';
import { oidcKeypair, oidcProviderClient } from '$lib/server/oidc';
import { publicJwks } from '$lib/server/oidc/core';

export const GET: RequestHandler = () => {
	if (!oidcProviderClient()) error(404, 'Not found');
	return json(publicJwks(oidcKeypair()));
};
