import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readSession } from '$lib/server/session';
import { loadSettingsForSession, saveSettingsForSession } from '$lib/server/settings-store';
import type { AccountSettingsBlob } from '$lib/settings/account-settings-types';

export const GET: RequestHandler = async ({ cookies }) => {
	const session = readSession(cookies);
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const blob = await loadSettingsForSession(session, cookies);
		return json(blob);
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Could not load settings';
		return json({ error: message }, { status: 502 });
	}
};

export const PUT: RequestHandler = async ({ cookies, request }) => {
	const session = readSession(cookies);
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	let body: { blob?: AccountSettingsBlob; baseUpdatedAt?: string };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid request body' }, { status: 400 });
	}

	if (!body.blob || body.blob.version !== 2 || typeof body.blob.updatedAt !== 'string') {
		return json({ error: 'Invalid settings payload' }, { status: 400 });
	}

	try {
		const result = await saveSettingsForSession(session, body.blob, body.baseUpdatedAt, cookies);
		return json(result);
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Could not save settings';
		return json({ error: message }, { status: 502 });
	}
};
