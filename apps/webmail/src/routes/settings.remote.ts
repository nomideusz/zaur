import { query, command, getRequestEvent } from '$app/server';
import { error } from '@sveltejs/kit';
import { createConnectedClient } from '$lib/server/jmap';
import { loadAccountSettings, saveAccountSettings } from '$lib/server/account-settings';
import { readSession } from '$lib/server/session';
import {
	ACCOUNT_SETTINGS_SCHEMA_VERSION,
	sanitizeAccountSettings,
	type AccountSettingsBlob
} from '$lib/settings/account-settings-types';

function getSession() {
	const { cookies } = getRequestEvent();
	const session = readSession(cookies);
	if (!session) {
		error(401, 'Unauthorized');
	}
	return session;
}

export const loadSettings = query(async () => {
	const session = getSession();
	const client = await createConnectedClient(session);
	const blob = await loadAccountSettings(client);
	return blob ?? null;
});

function schema<T>() {
	return {
		'~standard': {
			version: 1,
			vendor: 'zaur',
			validate(value: unknown) {
				return { value: value as T };
			}
		}
	} as any;
}

export const saveSettings = command(
	schema<{ blob: AccountSettingsBlob; baseUpdatedAt?: string }>(),
	async ({ blob, baseUpdatedAt }) => {
		const session = getSession();
		const client = await createConnectedClient(session);

		const existing = await loadAccountSettings(client);
		if (existing?.updatedAt && baseUpdatedAt && existing.updatedAt > baseUpdatedAt) {
			return { conflict: true as const, remote: existing };
		}

		const sanitizedSettings = sanitizeAccountSettings(blob.settings, session.username);
		const sanitizedBlob: AccountSettingsBlob = {
			version: ACCOUNT_SETTINGS_SCHEMA_VERSION,
			updatedAt: blob.updatedAt,
			settings: sanitizedSettings
		};

		await saveAccountSettings(client, sanitizedBlob);
		return { conflict: false as const, updatedAt: sanitizedBlob.updatedAt };
	}
);
