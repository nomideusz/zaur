import { browser } from '$app/environment';
import { toast } from '$lib/stores/toast.svelte';
import {
	ACCOUNT_SETTINGS_SYNC_AT_KEY,
	accountSettingsSyncAtKey,
	type AccountSettingsBlob
} from '$lib/settings/account-settings-types';

const PUSH_DEBOUNCE_MS = 1500;

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pushInFlight = false;
let syncAccountEmail: string | null = null;

const EMAIL_SCOPED_PREFIXES = ['zaur:display-name:', 'zaur:signature:', 'zaur:use-signature:'] as const;

function isOtherAccountsScopedKey(key: string, email: string): boolean {
	for (const prefix of EMAIL_SCOPED_PREFIXES) {
		if (!key.startsWith(prefix)) continue;
		return key.slice(prefix.length).trim().toLowerCase() !== email;
	}
	return false;
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
		if (syncAccountEmail && isOtherAccountsScopedKey(key, syncAccountEmail)) continue;

		const value = localStorage.getItem(key);
		if (value !== null) data[key] = value;
	}
	return data;
}

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
		void pushAccountSettings();
	}, PUSH_DEBOUNCE_MS);
}

async function pushAccountSettings(): Promise<void> {
	if (!browser || pushInFlight || !syncAccountEmail) return;

	pushInFlight = true;
	const email = syncAccountEmail;
	const updatedAt = new Date().toISOString();
	const blob: AccountSettingsBlob = {
		version: 2,
		updatedAt,
		settings: collectSyncableSettings()
	};

	try {
		const response = await fetch('/api/settings', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(blob)
		});

		if (response.ok) {
			const payload = (await response.json()) as { updatedAt?: string };
			markSyncedAt(email, payload.updatedAt ?? updatedAt);
			return;
		}

		const payload = (await response.json().catch(() => null)) as { error?: string } | null;
		const message = payload?.error ?? `Could not save settings (${response.status})`;
		console.warn('Account settings sync failed:', message);
		toast.show(message, 'error');
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Could not save settings';
		console.warn('Account settings sync failed:', error);
		toast.show(message, 'error');
	} finally {
		pushInFlight = false;
	}
}

export async function pullAccountSettings(
	email: string | null,
	apply: () => void
): Promise<'applied' | 'unchanged' | 'empty'> {
	if (!browser || !email) return 'empty';

	const normalizedEmail = email.trim().toLowerCase();

	try {
		const response = await fetch('/api/settings');
		if (response.status === 401) return 'empty';
		if (!response.ok) return 'unchanged';

		const payload = (await response.json()) as { settings: AccountSettingsBlob | null };
		const remote = payload.settings;
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
		if (localAt && remote.updatedAt <= localAt) {
			if (localAt > remote.updatedAt) {
				scheduleAccountSettingsPush();
			}
			return 'unchanged';
		}

		for (const [key, value] of Object.entries(remote.settings)) {
			if (typeof value !== 'string') continue;
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
