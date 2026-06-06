import { query, command, getRequestEvent } from '$app/server';
import { error } from '@sveltejs/kit';
import { readSession } from '$lib/server/session';
import { loadSettingsForSession, saveSettingsForSession } from '$lib/server/settings-store';
import type { AccountSettingsBlob } from '$lib/settings/account-settings-types';

function getSession() {
	const { cookies } = getRequestEvent();
	const session = readSession(cookies);
	if (!session) {
		error(401, 'Unauthorized');
	}
	return { session, cookies };
}

export const loadSettings = query(async () => {
	const { session, cookies } = getSession();
	return loadSettingsForSession(session, cookies);
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
		const { session, cookies } = getSession();
		return saveSettingsForSession(session, blob, baseUpdatedAt, cookies);
	}
);
