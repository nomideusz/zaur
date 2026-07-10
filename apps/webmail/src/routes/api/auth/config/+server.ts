import { json, type RequestHandler } from '@sveltejs/kit';
import { isStalwartOauthEnabled } from '$lib/server/oauth-config';

/**
 * Client-safe sign-in configuration. Tokens and OAuth client secrets never leave
 * the server; the browser only needs to know whether the redirect flow is enabled.
 */
export const GET: RequestHandler = async () => {
	return json({ enabled: isStalwartOauthEnabled(), passwordFallback: true });
};
