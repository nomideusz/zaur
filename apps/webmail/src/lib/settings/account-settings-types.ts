/** Blob stored on the JMAP account (archive message or future WebmailSettings object). */
export type AccountSettingsBlob = {
	version: number;
	updatedAt: string;
	settings: Record<string, string>;
};

export const ACCOUNT_SETTINGS_SCHEMA_VERSION = 2;
export const ACCOUNT_SETTINGS_SUBJECT = '__zaur_webmail_settings_v1__';
export const ACCOUNT_SETTINGS_SYNC_AT_KEY = 'zaur:account-settings-synced-at';

export function isAccountSettingsSubject(subject: string | undefined | null): boolean {
	return subject?.trim() === ACCOUNT_SETTINGS_SUBJECT;
}

/** Per-account sync cursor in localStorage (avoids cross-account sync conflicts). */
export function accountSettingsSyncAtKey(email: string): string {
	return `${ACCOUNT_SETTINGS_SYNC_AT_KEY}:${email.trim().toLowerCase()}`;
}

export const EMAIL_SCOPED_PREFIXES = ['zaur:display-name:', 'zaur:signature:', 'zaur:use-signature:'] as const;

export const DEVICE_LOCAL_SYNC_KEYS = new Set(['zaur:remember-me', 'zaur:remembered-email']);

export function isOtherAccountsScopedKey(key: string, email: string): boolean {
	for (const prefix of EMAIL_SCOPED_PREFIXES) {
		if (!key.startsWith(prefix)) continue;
		return key.slice(prefix.length).trim().toLowerCase() !== email.trim().toLowerCase();
	}
	return false;
}

/** Strip keys that must not be stored on the JMAP account. */
export function sanitizeAccountSettings(
	settings: Record<string, string>,
	email?: string
): Record<string, string> {
	const normalizedEmail = email?.trim().toLowerCase();
	const sanitized: Record<string, string> = {};

	for (const [key, value] of Object.entries(settings)) {
		if (typeof value !== 'string') continue;
		if (DEVICE_LOCAL_SYNC_KEYS.has(key)) continue;
		if (key === ACCOUNT_SETTINGS_SYNC_AT_KEY || key.startsWith(`${ACCOUNT_SETTINGS_SYNC_AT_KEY}:`)) {
			continue;
		}
		if (!key.startsWith('zaur:') && key !== 'zaur-theme') continue;
		if (normalizedEmail && isOtherAccountsScopedKey(key, normalizedEmail)) continue;
		sanitized[key] = value;
	}

	return sanitized;
}
