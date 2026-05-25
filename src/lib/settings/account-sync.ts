import { browser } from '$app/environment';
import { ACCOUNT_SETTINGS_SYNC_AT_KEY, type AccountSettingsBlob } from '$lib/settings/account-settings-types';

const PUSH_DEBOUNCE_MS = 1500;

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pushInFlight = false;

/** Keys synced to the JMAP account (device-local-only keys are omitted). */
export function collectSyncableSettings(): Record<string, string> {
	if (!browser) return {};

	const data: Record<string, string> = {};
	for (let index = 0; index < localStorage.length; index++) {
		const key = localStorage.key(index);
		if (!key || key === ACCOUNT_SETTINGS_SYNC_AT_KEY) continue;
		if (!key.startsWith('zaur:') && key !== 'zaur-theme') continue;
		const value = localStorage.getItem(key);
		if (value !== null) data[key] = value;
	}
	return data;
}

function markSyncedAt(updatedAt: string) {
	localStorage.setItem(ACCOUNT_SETTINGS_SYNC_AT_KEY, updatedAt);
}

export function scheduleAccountSettingsPush() {
	if (!browser) return;
	if (pushTimer) clearTimeout(pushTimer);
	pushTimer = setTimeout(() => {
		pushTimer = null;
		void pushAccountSettings();
	}, PUSH_DEBOUNCE_MS);
}

async function pushAccountSettings(): Promise<void> {
	if (!browser || pushInFlight) return;

	pushInFlight = true;
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
			markSyncedAt(payload.updatedAt ?? updatedAt);
		}
	} catch {
		// Offline or server unavailable — local values remain; will retry on next change.
	} finally {
		pushInFlight = false;
	}
}

export async function pullAccountSettings(apply: () => void): Promise<'applied' | 'unchanged' | 'empty'> {
	if (!browser) return 'empty';

	try {
		const response = await fetch('/api/settings');
		if (response.status === 401) return 'empty';
		if (!response.ok) return 'unchanged';

		const payload = (await response.json()) as { settings: AccountSettingsBlob | null };
		const remote = payload.settings;
		if (!remote?.settings) return 'empty';

		const localAt = localStorage.getItem(ACCOUNT_SETTINGS_SYNC_AT_KEY) ?? '';
		if (localAt && remote.updatedAt <= localAt) {
			if (localAt > remote.updatedAt) {
				scheduleAccountSettingsPush();
			}
			return 'unchanged';
		}

		for (const [key, value] of Object.entries(remote.settings)) {
			if (typeof value !== 'string') continue;
			if (!key.startsWith('zaur:') && key !== 'zaur-theme') continue;
			localStorage.setItem(key, value);
		}

		markSyncedAt(remote.updatedAt);
		apply();
		return 'applied';
	} catch {
		return 'unchanged';
	}
}
