import { json, type RequestHandler } from '@sveltejs/kit';
import { createConnectedClient } from '$lib/server/jmap';
import { loadAccountSettings, saveAccountSettings } from '$lib/server/account-settings';
import { readSession } from '$lib/server/session';
import {
	ACCOUNT_SETTINGS_SCHEMA_VERSION,
	type AccountSettingsBlob
} from '$lib/settings/account-settings-types';

function isValidBlob(body: unknown): body is AccountSettingsBlob {
	if (!body || typeof body !== 'object') return false;
	const blob = body as AccountSettingsBlob;
	return (
		blob.version === ACCOUNT_SETTINGS_SCHEMA_VERSION &&
		typeof blob.updatedAt === 'string' &&
		blob.settings !== null &&
		typeof blob.settings === 'object' &&
		!Array.isArray(blob.settings)
	);
}

export const GET: RequestHandler = async ({ cookies }) => {
	const session = readSession(cookies);
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const client = await createConnectedClient(session);
		const blob = await loadAccountSettings(client);
		if (!blob) {
			return json({ settings: null });
		}
		return json({ settings: blob });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to load settings';
		return json({ error: message }, { status: 502 });
	}
};

export const PUT: RequestHandler = async ({ request, cookies }) => {
	const session = readSession(cookies);
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid request body' }, { status: 400 });
	}

	if (!isValidBlob(body)) {
		return json({ error: 'Invalid settings payload' }, { status: 400 });
	}

	const settings: Record<string, string> = {};
	for (const [key, value] of Object.entries(body.settings)) {
		if (typeof value !== 'string') continue;
		if (!key.startsWith('zaur:') && key !== 'zaur-theme') continue;
		if (key === 'zaur:account-settings-synced-at') continue;
		settings[key] = value;
	}

	const blob: AccountSettingsBlob = {
		version: ACCOUNT_SETTINGS_SCHEMA_VERSION,
		updatedAt: body.updatedAt,
		settings
	};

	try {
		const client = await createConnectedClient(session);
		await saveAccountSettings(client, blob);
		return json({ ok: true, updatedAt: blob.updatedAt });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to save settings';
		return json({ error: message }, { status: 502 });
	}
};
