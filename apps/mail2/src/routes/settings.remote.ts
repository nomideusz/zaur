import { error } from '@sveltejs/kit';
import { query, command } from '$app/server';
import { getAccountPrefs, getStoreDb, putAccountPrefs } from '@zaur/server-auth';
import { connect, requireAccountKey } from '#lib/server/account';
import { ACCOUNT_PREF_KEYS, DEFAULT_PREFS, type AccountPrefs } from '#lib/settings';

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

/**
 * Only the four keys that belong to the account are ever accepted, whatever a
 * client sends — a device-shaped preference stored per account is worse than
 * one stored per device, and this is the boundary that enforces it.
 */
function sanitize(input: unknown): Partial<AccountPrefs> {
	if (!input || typeof input !== 'object') return {};
	const source = input as Record<string, unknown>;
	const clean: Record<string, unknown> = {};
	for (const key of ACCOUNT_PREF_KEYS) {
		const value = source[key];
		if (typeof value === typeof DEFAULT_PREFS[key]) clean[key] = value;
	}
	return clean as Partial<AccountPrefs>;
}

/** The account's own copy of the prefs that travel. `null` before it has any. */
export const accountPrefs = query(async (): Promise<Partial<AccountPrefs> | null> => {
	const key = requireAccountKey();
	const raw = getAccountPrefs(getStoreDb(), key);
	if (!raw) return null;
	try {
		return sanitize(JSON.parse(raw));
	} catch {
		// Someone's row is corrupt; defaults beat an error page in settings.
		return null;
	}
});

export const setAccountPrefs = command(
	schema<Partial<AccountPrefs>>(),
	async (input): Promise<void> => {
		const key = requireAccountKey();
		const clean = sanitize(input);
		const existing = getAccountPrefs(getStoreDb(), key);
		let merged = clean;
		if (existing) {
			try {
				merged = { ...sanitize(JSON.parse(existing)), ...clean };
			} catch {
				// keep `clean`
			}
		}
		putAccountPrefs(getStoreDb(), key, JSON.stringify(merged));
		// Ride the fresh copy back with the response: a page that adopts the
		// cached one after this (Settings → Mail) would otherwise revert the change.
		await accountPrefs().refresh();
	}
);

export type IdentityDTO = { id: string; email: string; name: string };

/** Send-as addresses: the primary plus any aliases Stalwart knows about. */
export const identities = query(async (): Promise<IdentityDTO[]> => {
	const client = await connect();
	const list = await client.getIdentities();
	return list.map((identity) => ({
		id: identity.id,
		email: identity.email,
		name: identity.name ?? ''
	}));
});

/** The name recipients see on mail sent from this address. */
export const setDisplayName = command(
	schema<{ identityId: string; name: string }>(),
	async ({ identityId, name }): Promise<{ ok: true }> => {
		const trimmed = String(name ?? '').trim();
		if (trimmed.length > 120) error(400, 'Display name is too long');
		const client = await connect();
		await client.setIdentityName(String(identityId), trimmed);
		return { ok: true };
	}
);
