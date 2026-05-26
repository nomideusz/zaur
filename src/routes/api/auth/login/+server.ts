import { json, type RequestHandler } from '@sveltejs/kit';
import { appConfig } from '$lib/config';
import { createConnectedClient } from '$lib/server/jmap';
import { classifyJmapError, loginErrorMessage } from '$lib/jmap/errors';
import { findIdentityEmail, normalizeEmail } from '$lib/jmap/account';
import { writeSession } from '$lib/server/session';

export const POST: RequestHandler = async ({ request, cookies }) => {
	let body: { email?: string; password?: string; totp?: string; rememberMe?: boolean };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid request body' }, { status: 400 });
	}

	const email = normalizeEmail(body.email ?? '');
	const password = body.password;
	if (!email || !password) {
		return json({ error: 'Email and password are required' }, { status: 400 });
	}

	const effectivePassword = body.totp?.trim() ? `${password}$${body.totp.trim()}` : password;
	const serverUrl = appConfig.jmapServerUrl;

	try {
		const client = await createConnectedClient({
			serverUrl,
			username: email,
			password: effectivePassword
		});

		const identities = await client.getIdentities();
		const primary = findIdentityEmail(identities, email) ?? identities[0];

		writeSession(
			cookies,
			{
				serverUrl,
				username: email,
				password: effectivePassword
			},
			{ remember: body.rememberMe === true }
		);

		return json({
			serverUrl,
			username: email,
			displayName: primary?.name ?? primary?.email ?? email
		});
	} catch (error) {
		console.error('[Login Error]:', error);
		const code = classifyJmapError(error);
		const message = loginErrorMessage(code, serverUrl);

		if (code === 'invalid_credentials') {
			return json({ error: message, code }, { status: 401 });
		}
		if (code === 'server_unavailable' || code === 'connection_failed') {
			return json({ error: message, code }, { status: 503 });
		}
		return json({ error: message, code: 'generic' }, { status: 502 });
	}
};
