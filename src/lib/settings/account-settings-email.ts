import type { JMAPClient } from '$lib/jmap/client';
import type { JMAPEmail } from '$lib/jmap/types';
import { ACCOUNT_SETTINGS_SUBJECT } from '$lib/settings/account-settings-types';

async function listAccountSettingsEmails(client: JMAPClient): Promise<JMAPEmail[]> {
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
				properties: ['id', 'subject', 'keywords', 'mailboxIds']
			},
			'g0'
		]
	]);

	const getResult = response.methodResponses?.[1];
	if (getResult?.[0] !== 'Email/get') return [];
	return (getResult[1].list as JMAPEmail[]) ?? [];
}

/** Hidden settings-sync messages should never affect folder unread badges. */
export async function markAccountSettingsEmailsRead(client: JMAPClient): Promise<number> {
	const emails = await listAccountSettingsEmails(client);
	const unread = emails.filter((email) => !email.keywords?.$seen);
	if (!unread.length) return 0;

	const update = Object.fromEntries(
		unread.map((email) => [email.id, { 'keywords/$seen': true }])
	);

	await client.request([
		[
			'Email/set',
			{
				accountId: client.getAccountId(),
				update
			},
			'0'
		]
	]);

	return unread.length;
}
