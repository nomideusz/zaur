/** Blob stored on the JMAP account (archive message or future WebmailSettings object). */
export type AccountSettingsBlob = {
	version: number;
	updatedAt: string;
	settings: Record<string, string>;
};

export const ACCOUNT_SETTINGS_SCHEMA_VERSION = 2;
export const ACCOUNT_SETTINGS_SUBJECT = '__zaur_webmail_settings_v1__';
export const ACCOUNT_SETTINGS_SYNC_AT_KEY = 'zaur:account-settings-synced-at';

/** Per-account sync cursor in localStorage (avoids cross-account sync conflicts). */
export function accountSettingsSyncAtKey(email: string): string {
	return `${ACCOUNT_SETTINGS_SYNC_AT_KEY}:${email.trim().toLowerCase()}`;
}
