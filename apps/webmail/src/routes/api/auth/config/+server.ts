import { json, type RequestHandler } from '@sveltejs/kit';

/**
 * Sign-in configuration for the client. OAuth/OIDC/passkey sign-in has been
 * removed — this app only supports password (HTTP Basic → Stalwart JMAP) login.
 */
export const GET: RequestHandler = async () => {
	return json({ enabled: false, passwordFallback: true });
};
