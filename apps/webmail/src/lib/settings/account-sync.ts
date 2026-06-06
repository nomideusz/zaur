import { browser } from '$app/environment';
import { toast } from '$lib/stores/toast.svelte';
import {
	ACCOUNT_SETTINGS_SYNC_AT_KEY,
	accountSettingsSyncAtKey,
	isOtherAccountsScopedKey,
	sanitizeAccountSettings,
	type AccountSettingsBlob
} from '$lib/settings/account-settings-types';
import { isObsoleteSettingKey } from '$lib/settings/obsolete-keys';

const PUSH_DEBOUNCE_MS = 1500;

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pushInFlight = false;
let syncAccountEmail: string | null = null;

async function fetchAccountSettings(): Promise<AccountSettingsBlob | null> {
	const response = await fetch('/api/settings');
	if (response.status === 401) {
		throw { status: 401 as const };
	}
	if (!response.ok) {
		throw new Error(`Could not load settings (${response.status})`);
	}
	return (await response.json()) as AccountSettingsBlob | null;
}

async function saveAccountSettingsRemote(
	blob: AccountSettingsBlob,
	baseUpdatedAt?: string
): Promise<
	| { conflict: true; remote: AccountSettingsBlob }
	| { conflict: false; updatedAt: string }
	| null
> {
	const response = await fetch('/api/settings', {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ blob, baseUpdatedAt })
	});
	if (response.status === 401) {
		throw { status: 401 as const };
	}
	if (!response.ok) {
		throw new Error(`Could not save settings (${response.status})`);
	}
	return (await response.json()) as
		| { conflict: true; remote: AccountSettingsBlob }
		| { conflict: false; updatedAt: string };
}

function isAuthSyncError(error: unknown): error is { status: 401 } {
	return typeof error === 'object' && error !== null && 'status' in error && (error as { status?: number }).status === 401;
}

/** Keys synced to the JMAP account (device-local-only keys are omitted). */
export function collectSyncableSettings(): Record<string, string> {
	if (!browser) return {};

	const data: Record<string, string> = {};
	for (let index = 0; index < localStorage.length; index++) {
		const key = localStorage.key(index);
		if (!key || key === ACCOUNT_SETTINGS_SYNC_AT_KEY || key.startsWith(`${ACCOUNT_SETTINGS_SYNC_AT_KEY}:`)) {
			continue;
		}
		if (!key.startsWith('zaur:') && key !== 'zaur-theme') continue;
		if (isObsoleteSettingKey(key)) continue;
		if (syncAccountEmail && isOtherAccountsScopedKey(key, syncAccountEmail)) continue;

		const value = localStorage.getItem(key);
		if (value !== null) data[key] = value;
	}

	return sanitizeAccountSettings(data, syncAccountEmail ?? undefined);
}

export { isOtherAccountsScopedKey };

export function setSyncAccountEmail(email: string | null) {
	syncAccountEmail = email?.trim().toLowerCase() ?? null;
}

function markSyncedAt(email: string, updatedAt: string) {
	localStorage.setItem(accountSettingsSyncAtKey(email), updatedAt);
}

export function scheduleAccountSettingsPush() {
	if (!browser || !syncAccountEmail) return;
	if (pushTimer) clearTimeout(pushTimer);
	pushTimer = setTimeout(() => {
		pushTimer = null;
		void pushAccountSettings({ quiet: true });
	}, PUSH_DEBOUNCE_MS);
}

async function pushAccountSettings(options?: { quiet?: boolean }): Promise<boolean> {
	if (!browser || pushInFlight || !syncAccountEmail) return false;

	pushInFlight = true;
	const email = syncAccountEmail;
	const baseUpdatedAt = localStorage.getItem(accountSettingsSyncAtKey(email)) ?? undefined;
	const updatedAt = new Date().toISOString();
	const blob: AccountSettingsBlob = {
		version: 2,
		updatedAt,
		settings: collectSyncableSettings()
	};

	try {
		const payload = await saveAccountSettingsRemote(blob, baseUpdatedAt);
		if (!payload) {
			const message = 'Could not save settings';
			if (!options?.quiet && navigator.onLine) {
				toast.show(message, 'error');
			}
			return false;
		}

		if ('conflict' in payload && payload.conflict) {
			if (payload.remote?.settings) {
				markSyncedAt(email, payload.remote.updatedAt);
				const applied = await pullAccountSettings(email, () => {}, { force: true });
				if (applied === 'applied') {
					scheduleAccountSettingsPush();
				}
			}
			if (!options?.quiet) {
				toast.show('Settings changed elsewhere. Pulled the latest copy and will retry.', 'info');
			}
			return false;
		}

		if ('updatedAt' in payload) {
			markSyncedAt(email, payload.updatedAt);
			void import('$lib/stores/auth.svelte').then(({ auth }) => {
				if (!auth.client) return;
				void import('$lib/stores/mail.svelte').then(({ mail }) => {
					void mail.refreshMailboxes(auth.client!);
				});
			});
			return true;
		}

		const message = 'Could not save settings';
		if (!options?.quiet && navigator.onLine) {
			toast.show(message, 'error');
		}
		return false;
	} catch (error) {
		if (isAuthSyncError(error)) {
			if (!options?.quiet && navigator.onLine) {
				toast.show('Sign in again to sync settings to your account', 'info');
			}
			return false;
		}

		const message = error instanceof Error ? error.message : 'Could not save settings';
		console.warn('Account settings sync failed:', message);
		if (!options?.quiet && navigator.onLine) {
			toast.show(message, 'error');
		}
		return false;
	} finally {
		pushInFlight = false;
	}
}

/** Flush pending settings changes to the account immediately. */
export async function pushAccountSettingsNow(): Promise<boolean> {
	if (pushTimer) {
		clearTimeout(pushTimer);
		pushTimer = null;
	}
	return pushAccountSettings();
}

export async function pullAccountSettings(
	email: string | null,
	apply: () => void,
	options?: { force?: boolean }
): Promise<'applied' | 'unchanged' | 'empty'> {
	if (!browser || !email) return 'empty';

	const normalizedEmail = email.trim().toLowerCase();

	try {
		const remote = await fetchAccountSettings();
		if (!remote?.settings) return 'empty';

		const syncAtKey = accountSettingsSyncAtKey(normalizedEmail);
		let localAt = localStorage.getItem(syncAtKey) ?? '';
		if (!localAt) {
			const legacyAt = localStorage.getItem(ACCOUNT_SETTINGS_SYNC_AT_KEY);
			if (legacyAt) {
				localAt = legacyAt;
				localStorage.setItem(syncAtKey, legacyAt);
				localStorage.removeItem(ACCOUNT_SETTINGS_SYNC_AT_KEY);
			}
		}
		if (!options?.force && localAt && remote.updatedAt <= localAt) {
			if (localAt > remote.updatedAt) {
				scheduleAccountSettingsPush();
			}
			return 'unchanged';
		}

		for (const [key, value] of Object.entries(remote.settings)) {
			if (typeof value !== 'string') continue;
			if (key.startsWith(ACCOUNT_SETTINGS_SYNC_AT_KEY)) continue;
			if (!key.startsWith('zaur:') && key !== 'zaur-theme') continue;
			if (isOtherAccountsScopedKey(key, normalizedEmail)) continue;
			localStorage.setItem(key, value);
		}

		markSyncedAt(normalizedEmail, remote.updatedAt);
		apply();
		return 'applied';
	} catch {
		return 'unchanged';
	}
}
