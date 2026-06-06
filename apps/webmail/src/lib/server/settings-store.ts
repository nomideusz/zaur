import { createConnectedClient } from '$lib/server/jmap';
import { loadAccountSettings, saveAccountSettings } from '$lib/server/account-settings';
import {
	ACCOUNT_SETTINGS_SCHEMA_VERSION,
	sanitizeAccountSettings,
	type AccountSettingsBlob
} from '$lib/settings/account-settings-types';
import type { Cookies } from '@sveltejs/kit';
import type { SessionData } from '$lib/server/session';

export type SaveSettingsResult =
	| { conflict: true; remote: AccountSettingsBlob }
	| { conflict: false; updatedAt: string };

export async function loadSettingsForSession(session: SessionData, cookies?: Cookies) {
	const client = await createConnectedClient(session, cookies);
	const blob = await loadAccountSettings(client);
	return blob ?? null;
}

export async function saveSettingsForSession(
	session: SessionData,
	blob: AccountSettingsBlob,
	baseUpdatedAt?: string,
	cookies?: Cookies
): Promise<SaveSettingsResult> {
	const client = await createConnectedClient(session, cookies);
	const existing = await loadAccountSettings(client);
	if (existing?.updatedAt && baseUpdatedAt && existing.updatedAt > baseUpdatedAt) {
		return { conflict: true, remote: existing };
	}

	const sanitizedSettings = sanitizeAccountSettings(blob.settings, session.username);
	const sanitizedBlob: AccountSettingsBlob = {
		version: ACCOUNT_SETTINGS_SCHEMA_VERSION,
		updatedAt: blob.updatedAt,
		settings: sanitizedSettings
	};

	await saveAccountSettings(client, sanitizedBlob);
	return { conflict: false, updatedAt: sanitizedBlob.updatedAt };
}
