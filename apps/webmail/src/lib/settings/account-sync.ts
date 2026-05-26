import { browser } from '$app/environment';
import { toast } from '$lib/stores/toast.svelte';
import {
	ACCOUNT_SETTINGS_SYNC_AT_KEY,
	accountSettingsSyncAtKey,
	isOtherAccountsScopedKey,
	sanitizeAccountSettings,
	type AccountSettingsBlob
} from '$lib/settings/account-settings-types';

const PUSH_DEBOUNCE_MS = 1500;

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pushInFlight = false;
let syncAccountEmail: string | null = null;

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
		const response = await fetch('/api/settings', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ ...blob, baseUpdatedAt })
		});

		if (response.ok) {
			const payload = (await response.json()) as { updatedAt?: string };
			markSyncedAt(email, payload.updatedAt ?? updatedAt);
			void import('$lib/stores/auth.svelte').then(({ auth }) => {
				if (!auth.client) return;
				void import('$lib/stores/mail.svelte').then(({ mail }) => {
					void mail.refreshMailboxes(auth.client!);
				});
			});
			return true;
		}

		const payload = (await response.json().catch(() => null)) as { error?: string; remote?: AccountSettingsBlob } | null;
		if (response.status === 409 && payload?.remote?.settings) {
			markSyncedAt(email, payload.remote.updatedAt);
			const applied = await pullAccountSettings(email, () => {}, { force: true });
			if (applied === 'applied') {
				scheduleAccountSettingsPush();
			}
			if (!options?.quiet) {
				toast.show('Settings changed elsewhere. Pulled the latest copy and will retry.', 'info');
			}
			return false;
		}
		const message = payload?.error ?? `Could not save settings (${response.status})`;
		console.warn('Account settings sync failed:', message);
		if (!options?.quiet && navigator.onLine) {
			toast.show(message, 'error');
		}
		return false;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Could not save settings';
		console.warn('Account settings sync failed:', error);
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
		const response = await fetch('/api/settings');
		if (response.status === 401) return 'empty';
		if (!response.ok) {
			console.warn('Account settings pull failed:', response.status);
			return 'unchanged';
		}

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
