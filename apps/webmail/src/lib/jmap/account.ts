import type { JMAPIdentity, JMAPSession } from './types';

const MAIL_URN = 'urn:ietf:params:jmap:mail';

export function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

function accountHasMail(session: JMAPSession, accountId: string): boolean {
	return !!session.accounts?.[accountId]?.accountCapabilities?.[MAIL_URN];
}

/** Pick the JMAP mail account that belongs to the signed-in user. */
export function resolveMailAccountId(session: JMAPSession, username: string): string {
	const normalized = normalizeEmail(username);
	const accounts = session.accounts ?? {};

	for (const [id, account] of Object.entries(accounts)) {
		if (account.name?.toLowerCase() === normalized) return id;
	}

	const primary = session.primaryAccounts?.[MAIL_URN];
	if (primary && accounts[primary]) return primary;

	for (const id of Object.keys(accounts)) {
		if (accountHasMail(session, id)) return id;
	}

	return Object.keys(accounts)[0] ?? '';
}

export function findIdentityEmail(
	identities: JMAPIdentity[],
	username: string
): JMAPIdentity | undefined {
	const normalized = normalizeEmail(username);
	return identities.find((identity) => normalizeEmail(identity.email) === normalized);
}
