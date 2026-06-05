import { buildEmailCreateData } from '$lib/jmap/email-build';
import type { JMAPClient } from '$lib/jmap/client';
import type { JMAPEmail } from '$lib/jmap/types';
import {
	ACCOUNT_SETTINGS_SCHEMA_VERSION,
	ACCOUNT_SETTINGS_SUBJECT,
	sanitizeAccountSettings,
	type AccountSettingsBlob
} from '$lib/settings/account-settings-types';

const WEBMAIL_SETTINGS_URN = 'https://zaur.app/jmap/webmail-settings/v1';

type JmapMethodResponse = [string, Record<string, unknown>?];

type SetFailure = {
	type?: string;
	description?: string;
	properties?: string[];
};

function formatSetFailure(failure: SetFailure, fallback: string): string {
	const props = failure.properties?.length ? ` (${failure.properties.join(', ')})` : '';
	return (failure.description ?? failure.type ?? fallback) + props;
}

function assertEmailSetSucceeded(response: Awaited<ReturnType<JMAPClient['request']>>) {
	const first = response.methodResponses?.[0] as unknown as JmapMethodResponse | undefined;
	if (first?.[0] === 'error') {
		const error = first[1] as SetFailure;
		throw new Error(formatSetFailure(error, 'Email/set failed'));
	}
	if (first?.[0] !== 'Email/set') {
		throw new Error('Unexpected Email/set response');
	}

	const result = first[1] ?? {};
	for (const key of ['notCreated', 'notUpdated', 'notDestroyed'] as const) {
		const failures = result[key] as Record<string, SetFailure> | undefined;
		if (!failures || !Object.keys(failures).length) continue;
		throw new Error(formatSetFailure(Object.values(failures)[0], `${key} failed`));
	}
}

function assertWebmailSettingsSetSucceeded(response: Awaited<ReturnType<JMAPClient['request']>>) {
	const first = response.methodResponses?.[0] as unknown as JmapMethodResponse | undefined;
	if (first?.[0] === 'error') {
		const error = first[1] as SetFailure;
		throw new Error(formatSetFailure(error, 'WebmailSettings/set failed'));
	}
	if (first?.[0] !== 'WebmailSettings/set') {
		throw new Error('Unexpected WebmailSettings/set response');
	}

	const result = first[1] ?? {};
	for (const key of ['notCreated', 'notUpdated', 'notDestroyed'] as const) {
		const failures = result[key] as Record<string, SetFailure> | undefined;
		if (!failures || !Object.keys(failures).length) continue;
		throw new Error(formatSetFailure(Object.values(failures)[0], `${key} failed`));
	}
}

function pickSettingsMailbox(
	mailboxes: Awaited<ReturnType<JMAPClient['getMailboxes']>>
): string | null {
	const archive = mailboxes.find((mb) => mb.role === 'archive');
	if (archive) return archive.id;
	const trash = mailboxes.find((mb) => mb.role === 'trash');
	if (trash) return trash.id;
	const fallback = mailboxes.find(
		(mb) => mb.role !== 'drafts' && mb.role !== 'inbox' && mb.role !== 'sent'
	);
	return fallback?.id ?? null;
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

async function saveViaWebmailSettings(client: JMAPClient, blob: AccountSettingsBlob): Promise<void> {
	const accountId = client.getAccountId();
	const existing = await loadViaWebmailSettings(client);
	const patch = { settings: blob.settings };

	const response = await client.request(
		[
			[
				'WebmailSettings/set',
				existing
					? { accountId, update: { singleton: patch } }
					: { accountId, create: { singleton: patch } },
				'ws-set'
			]
		],
		[WEBMAIL_SETTINGS_URN, 'urn:ietf:params:jmap:core']
	);

	assertWebmailSettingsSetSucceeded(response);
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
	const destroyIds = (await listSettingsEmails(client)).map((email) => email.id);

	const emailData = buildEmailCreateData({
		fromEmail: username,
		to: [username],
		subject: ACCOUNT_SETTINGS_SUBJECT,
		bodyText: body,
		mailboxIds: { [mailboxId]: true },
		keywords: { $seen: true }
	});

	const response = await client.request([
		[
			'Email/set',
			{
				accountId: client.getAccountId(),
				create: { 'settings-v1': emailData },
				...(destroyIds.length ? { destroy: destroyIds } : {})
			},
			'0'
		]
	]);
	assertEmailSetSucceeded(response);
}

export async function loadAccountSettings(client: JMAPClient): Promise<AccountSettingsBlob | null> {
	if (client.getSession()?.capabilities?.[WEBMAIL_SETTINGS_URN]) {
		const fromExtension = await loadViaWebmailSettings(client);
		if (fromExtension) return fromExtension;
	}

	return loadViaSettingsEmail(client);
}

export async function saveAccountSettings(client: JMAPClient, blob: AccountSettingsBlob): Promise<void> {
	const username = client.getUsername() ?? undefined;
	const payload: AccountSettingsBlob = {
		...blob,
		settings: sanitizeAccountSettings(blob.settings, username)
	};

	if (client.getSession()?.capabilities?.[WEBMAIL_SETTINGS_URN]) {
		try {
			await saveViaWebmailSettings(client, payload);
			return;
		} catch (error) {
			console.warn('WebmailSettings/set failed, falling back to settings email:', error);
		}
	}

	await saveViaSettingsEmail(client, payload);
}
