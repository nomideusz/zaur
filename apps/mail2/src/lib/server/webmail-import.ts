/**
 * Webmail 1.0 kept the account's signature in its settings email (a JSON blob
 * under WEBMAIL_SETTINGS_SUBJECT) and added it to mail from every address;
 * mail2 keeps one per address on the JMAP Identity. The first time mail2 loads
 * an account's identities, the 1.0 signature goes onto the ones that have none
 * and the settings email is tagged so it is not copied again. Webmail rewrites
 * that email on its next save, so only a rollback would bring the copy back,
 * and then only for addresses still without a signature.
 */
import type { JMAPClient, JMAPEmail, JMAPIdentity } from '@zaur/mail-core';

export const WEBMAIL_SETTINGS_SUBJECT = '__zaur_webmail_settings_v1__';
const IMPORTED = '$zaur-mail2-imported';

type SettingsEmail = Pick<JMAPEmail, 'id' | 'subject' | 'keywords' | 'bodyValues' | 'receivedAt'>;

/** The newest settings email not yet imported, with the signature 1.0 would add ('' = none, or switched off). */
export function webmailSignature(emails: SettingsEmail[], username: string): { emailId: string; signature: string } | null {
	let newest: { email: SettingsEmail; settings: Record<string, unknown>; at: string } | null = null;
	for (const email of emails) {
		if (email.subject?.trim() !== WEBMAIL_SETTINGS_SUBJECT) continue;
		let blob: { updatedAt?: unknown; settings?: unknown } | null = null;
		try {
			blob = JSON.parse(Object.values(email.bodyValues ?? {})[0]?.value ?? '');
		} catch {
			continue;
		}
		if (!blob?.settings || typeof blob.settings !== 'object') continue;
		const at = typeof blob.updatedAt === 'string' ? blob.updatedAt : (email.receivedAt ?? '');
		if (!newest || at > newest.at) newest = { email, settings: blob.settings as Record<string, unknown>, at };
	}
	if (!newest || newest.email.keywords?.[IMPORTED]) return null;

	const user = username.toLowerCase();
	const setting = (prefix: string) =>
		Object.entries(newest.settings).find(([key]) => key.toLowerCase() === prefix + user)?.[1];
	const signature = setting('zaur:signature:');
	const on = setting('zaur:use-signature:') !== 'false';
	return { emailId: newest.email.id, signature: on && typeof signature === 'string' ? signature.trim() : '' };
}

// ponytail: once per account per process; the keyword on the settings email is the durable marker.
const checked = new Set<string>();

/** Fills `identities` in place, so the caller does not have to fetch them again. */
export async function importWebmailSignature(client: JMAPClient, identities: JMAPIdentity[]): Promise<void> {
	const username = client.getUsername().toLowerCase();
	if (checked.has(username)) return;
	checked.add(username);
	const accountId = client.getAccountId();
	const response = await client.request([
		['Email/query', { accountId, filter: { subject: WEBMAIL_SETTINGS_SUBJECT }, limit: 8 }, 'q'],
		[
			'Email/get',
			{
				accountId,
				'#ids': { resultOf: 'q', name: 'Email/query', path: '/ids' },
				properties: ['id', 'subject', 'keywords', 'bodyValues', 'textBody', 'receivedAt'],
				fetchTextBodyValues: true,
				maxBodyValueBytes: 512_000
			},
			'g'
		]
	]);
	const got = response.methodResponses?.[1];
	const found = webmailSignature(got?.[0] === 'Email/get' ? (got[1].list as SettingsEmail[]) : [], username);
	if (!found) return;
	if (found.signature) {
		for (const identity of identities.filter((i) => !i.textSignature?.trim())) {
			await client.updateIdentity(identity.id, { textSignature: found.signature });
			identity.textSignature = found.signature;
		}
	}
	await client.patchKeywords({ [found.emailId]: { [IMPORTED]: true } });
}
