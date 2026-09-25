import { error } from '@sveltejs/kit';
import { query, command } from '$app/server';
import { getAccountPrefs, getStoreDb, putAccountPrefs } from '@zaur/server-auth';
import { connect, refuse, requireAccountKey } from '#lib/server/account';
import { ACCOUNT_PREF_KEYS, DEFAULT_PREFS, type AccountPrefs } from '#lib/settings';
import { aiCategoriesAvailable } from '#lib/server/categorize';
import { importWebmailSignature } from '#lib/server/webmail-import';

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

/** Whether this server can categorise mail with AI at all (it needs a TypeSafe key). */
export const aiCategoriesOffered = query(async (): Promise<boolean> => aiCategoriesAvailable());

export type IdentityDTO = { id: string; email: string; name: string; signature: string };

/**
 * Send-as addresses: the primary first, then any aliases Stalwart knows about.
 * The first load also brings over webmail 1.0's signature, if there is one.
 */
export const identities = query(async (): Promise<IdentityDTO[]> => {
	const client = await connect();
	const primary = client.getUsername().toLowerCase();
	const list = await client.getIdentities();
	await importWebmailSignature(client, list).catch((cause) =>
		console.warn('[identities] webmail signature import failed', primary, cause)
	);
	return list
		.map((identity) => ({
			id: identity.id,
			email: identity.email,
			name: identity.name ?? '',
			signature: identity.textSignature ?? ''
		}))
		.sort((a, b) => Number(b.email.toLowerCase() === primary) - Number(a.email.toLowerCase() === primary));
});

/** The name recipients see on mail sent from this address, and the signature compose adds. */
export const updateIdentity = command(
	schema<{ identityId: string; name: string; signature: string }>(),
	async ({ identityId, name, signature }): Promise<{ ok: true }> => {
		const trimmed = String(name ?? '').trim();
		if (trimmed.length > 120) error(400, 'Display name is too long');
		const text = String(signature ?? '').trimEnd();
		if (text.length > 4000) error(400, 'Signature is too long');
		const client = await connect();
		await client.updateIdentity(String(identityId), { name: trimmed, textSignature: text }).catch(refuse);
		await identities().refresh();
		return { ok: true };
	}
);

export type VacationDTO = {
	/** False when the server does not offer auto-replies to this account. */
	supported: boolean;
	isEnabled: boolean;
	/** `YYYY-MM-DD`, or '' for "starts right away" / "until switched off". */
	fromDate: string;
	toDate: string;
	subject: string;
	textBody: string;
};

/** The account's out-of-office auto-reply (JMAP VacationResponse). */
export const vacation = query(async (): Promise<VacationDTO> => {
	const client = await connect();
	const current = await client.getVacationResponse();
	return {
		supported: client.hasVacationResponse(),
		isEnabled: current?.isEnabled ?? false,
		fromDate: current?.fromDate?.slice(0, 10) ?? '',
		toDate: current?.toDate?.slice(0, 10) ?? '',
		subject: current?.subject ?? '',
		textBody: current?.textBody ?? ''
	};
});

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export const saveVacation = command(
	schema<Omit<VacationDTO, 'supported'>>(),
	async (input): Promise<{ ok: true }> => {
		const fromDate = String(input.fromDate ?? '');
		const toDate = String(input.toDate ?? '');
		if ((fromDate && !DAY.test(fromDate)) || (toDate && !DAY.test(toDate))) error(400, 'Pick a valid date');
		if (fromDate && toDate && toDate < fromDate) error(400, 'The last day is before the first');
		const subject = String(input.subject ?? '').trim();
		const textBody = String(input.textBody ?? '').trimEnd();
		if (subject.length > 200 || textBody.length > 8000) error(400, 'The auto-reply is too long');
		const client = await connect();
		// Whole days in UTC, the way webmail 1.0 stored them: "until the 20th" includes the 20th.
		await client.setVacationResponse({
			isEnabled: Boolean(input.isEnabled),
			fromDate: fromDate ? `${fromDate}T00:00:00Z` : null,
			toDate: toDate ? `${toDate}T23:59:59Z` : null,
			subject: subject || null,
			textBody: textBody || null
		}).catch(refuse);
		await vacation().refresh();
		return { ok: true };
	}
);
