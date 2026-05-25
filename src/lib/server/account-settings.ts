import { buildEmailCreateData } from '$lib/jmap/email-build';
import type { JMAPClient } from '$lib/jmap/client';
import type { JMAPEmail } from '$lib/jmap/types';
import {
	ACCOUNT_SETTINGS_SCHEMA_VERSION,
	ACCOUNT_SETTINGS_SUBJECT,
	type AccountSettingsBlob
} from '$lib/settings/account-settings-types';

const WEBMAIL_SETTINGS_URN = 'https://zaur.app/jmap/webmail-settings/v1';

type JmapMethodResponse = [string, Record<string, unknown>?];

function assertEmailSetSucceeded(response: Awaited<ReturnType<JMAPClient['request']>>) {
	const first = response.methodResponses?.[0] as JmapMethodResponse | undefined;
	if (first?.[0] === 'error') {
		const error = first[1] as { type?: string; description?: string };
		throw new Error(error.description ?? error.type ?? 'Email/set failed');
	}
	if (first?.[0] !== 'Email/set') {
		throw new Error('Unexpected Email/set response');
	}

	const result = first[1] ?? {};
	const notUpdated = result.notUpdated as Record<string, { type?: string; description?: string }> | undefined;
	if (notUpdated && Object.keys(notUpdated).length > 0) {
		const failure = Object.values(notUpdated)[0];
		throw new Error(failure?.description ?? failure?.type ?? 'Email/set failed');
	}
}

function pickSettingsMailbox(
	mailboxes: Awaited<ReturnType<JMAPClient['getMailboxes']>>
): string | null {
	const archive = mailboxes.find((mb) => mb.role === 'archive');
	if (archive) return archive.id;
	const drafts = mailboxes.find((mb) => mb.role === 'drafts');
	if (drafts) return drafts.id;
	return mailboxes[0]?.id ?? null;
}

function parseBlobFromEmail(email: JMAPEmail): AccountSettingsBlob | null {
	const raw =
		email.bodyValues?.['1']?.value ??
		(email.bodyValues ? Object.values(email.bodyValues)[0]?.value : undefined);
	if (!raw?.trim()) return null;

	try {
		const parsed = JSON.parse(raw) as AccountSettingsBlob;
		if (parsed.version !== ACCOUNT_SETTINGS_SCHEMA_VERSION || !parsed.settings) return null;
		if (typeof parsed.updatedAt !== 'string') return null;
		return parsed;
	} catch {
		return null;
	}
}

async function loadViaWebmailSettings(client: JMAPClient): Promise<AccountSettingsBlob | null> {
	const accountId = client.getAccountId();
	const response = await client.request(
		[['WebmailSettings/get', { accountId, ids: ['singleton'] }, 'ws-get']],
		[WEBMAIL_SETTINGS_URN, 'urn:ietf:params:jmap:core']
	);

	const first = response.methodResponses?.[0];
	if (first?.[0] === 'error') return null;
	if (first?.[0] !== 'WebmailSettings/get') return null;

	const list = (first[1].list as Array<{ id: string; settings?: Record<string, string>; updatedAt?: string }>) ?? [];
	const row = list.find((item) => item.id === 'singleton');
	if (!row?.settings) return null;

	return {
		version: ACCOUNT_SETTINGS_SCHEMA_VERSION,
		updatedAt: row.updatedAt ?? new Date(0).toISOString(),
		settings: row.settings
	};
}

async function saveViaWebmailSettings(client: JMAPClient, blob: AccountSettingsBlob): Promise<boolean> {
	const accountId = client.getAccountId();
	const response = await client.request(
		[
			[
				'WebmailSettings/set',
				{
					accountId,
					update: {
						singleton: {
							settings: blob.settings,
							updatedAt: blob.updatedAt
						}
					}
				},
				'ws-set'
			]
		],
		[WEBMAIL_SETTINGS_URN, 'urn:ietf:params:jmap:core']
	);

	const first = response.methodResponses?.[0];
	if (first?.[0] === 'error') return false;
	if (first?.[0] !== 'WebmailSettings/set') return false;

	const result = first[1] ?? {};
	const notUpdated = result.notUpdated as Record<string, unknown> | undefined;
	return !notUpdated || Object.keys(notUpdated).length === 0;
}

async function listSettingsEmails(client: JMAPClient): Promise<JMAPEmail[]> {
	const accountId = client.getAccountId();
	const response = await client.request([
		[
			'Email/query',
			{
				accountId,
				filter: { subject: ACCOUNT_SETTINGS_SUBJECT },
				limit: 8
			},
			'q0'
		],
		[
			'Email/get',
			{
				accountId,
				'#ids': { resultOf: 'q0', name: 'Email/query', path: '/ids' },
				properties: ['id', 'subject', 'bodyValues', 'textBody', 'mailboxIds', 'receivedAt'],
				fetchTextBodyValues: true,
				maxBodyValueBytes: 512000
			},
			'g0'
		]
	]);

	const getResult = response.methodResponses?.[1];
	if (getResult?.[0] !== 'Email/get') return [];
	return (getResult[1].list as JMAPEmail[]) ?? [];
}

function pickNewestSettingsEmail(emails: JMAPEmail[]): JMAPEmail | null {
	if (!emails.length) return null;

	let best: { email: JMAPEmail; updatedAt: string } | null = null;
	for (const email of emails) {
		const blob = parseBlobFromEmail(email);
		const updatedAt = blob?.updatedAt ?? email.receivedAt ?? '';
		if (!best || updatedAt > best.updatedAt) {
			best = { email, updatedAt };
		}
	}

	return best?.email ?? emails[0];
}

async function findSettingsEmail(client: JMAPClient): Promise<JMAPEmail | null> {
	return pickNewestSettingsEmail(await listSettingsEmails(client));
}

async function loadViaSettingsEmail(client: JMAPClient): Promise<AccountSettingsBlob | null> {
	const email = await findSettingsEmail(client);
	if (!email) return null;
	return parseBlobFromEmail(email);
}

async function saveViaSettingsEmail(client: JMAPClient, blob: AccountSettingsBlob): Promise<void> {
	const mailboxes = await client.getMailboxes();
	const mailboxId = pickSettingsMailbox(mailboxes);
	if (!mailboxId) throw new Error('No mailbox available to store settings');

	const username = client.getUsername();
	if (!username) throw new Error('Not signed in');

	const body = JSON.stringify(blob);
	const allSettingsEmails = await listSettingsEmails(client);
	const existing = pickNewestSettingsEmail(allSettingsEmails);
	const duplicateIds = allSettingsEmails
		.filter((email) => email.id !== existing?.id)
		.map((email) => email.id);

	const emailData = buildEmailCreateData({
		fromEmail: username,
		to: [username],
		subject: ACCOUNT_SETTINGS_SUBJECT,
		body,
		mailboxIds: { [mailboxId]: true },
		keywords: { $seen: true }
	});

	if (existing?.id) {
		const { mailboxIds: _mailboxIds, ...updateData } = emailData;
		const response = await client.request([
			['Email/set', { accountId: client.getAccountId(), update: { [existing.id]: updateData } }, '0']
		]);
		assertEmailSetSucceeded(response);
	} else {
		const response = await client.request([
			[
				'Email/set',
				{
					accountId: client.getAccountId(),
					create: { 'settings-v1': emailData }
				},
				'0'
			]
		]);
		assertEmailSetSucceeded(response);
	}

	if (duplicateIds.length) {
		const response = await client.request([
			['Email/set', { accountId: client.getAccountId(), destroy: duplicateIds }, '1']
		]);
		assertEmailSetSucceeded(response);
	}
}

export async function loadAccountSettings(client: JMAPClient): Promise<AccountSettingsBlob | null> {
	if (client.getSession()?.capabilities?.[WEBMAIL_SETTINGS_URN]) {
		const fromExtension = await loadViaWebmailSettings(client);
		if (fromExtension) return fromExtension;
	}

	return loadViaSettingsEmail(client);
}

export async function saveAccountSettings(client: JMAPClient, blob: AccountSettingsBlob): Promise<void> {
	if (client.getSession()?.capabilities?.[WEBMAIL_SETTINGS_URN]) {
		const ok = await saveViaWebmailSettings(client, blob);
		if (ok) return;
	}

	await saveViaSettingsEmail(client, blob);
}
