import { json, type RequestHandler } from '@sveltejs/kit';
import { appConfig } from '$lib/config';
import { createConnectedClient } from '$lib/server/jmap';
import { findIdentityEmail, normalizeEmail } from '$lib/jmap/account';
import { writeSession } from '$lib/server/session';

export const POST: RequestHandler = async ({ request, cookies }) => {
	let body: { email?: string; password?: string; totp?: string };
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

		writeSession(cookies, {
			serverUrl,
			username: email,
			password: effectivePassword
		});

		return json({
			serverUrl,
			username: email,
			displayName: primary?.name ?? primary?.email ?? email
		});
	} catch (error) {
		console.error('[Login Error]:', error);
		const message = error instanceof Error ? error.message : 'Sign-in failed';
		if (message.includes('Invalid username or password')) {
			return json({ error: message, code: 'invalid_credentials' }, { status: 401 });
		}
		return json({ error: message, code: 'generic' }, { status: 502 });
	}
};
