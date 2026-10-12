/**
 * What the signed-in account's JMAP server offers beyond mail, read from its
 * session capabilities by the (app) layout. A section or settings page whose
 * capability is missing is not linked to, so a mail-only server (Cyrus,
 * Apache James, Fastmail without files) shows no dead ends. The remote
 * functions check the same capabilities on their own.
 */
import type { JMAPClient } from '@zaur/mail-core';

export interface Features {
	calendars: boolean;
	contacts: boolean;
	files: boolean;
	/** Sieve: Rules & categories. */
	rules: boolean;
	/** VacationResponse: Auto-reply. */
	autoReply: boolean;
	/** Principals: sharing mailboxes, calendars and files. */
	sharing: boolean;
	/** Stalwart's self-service objects (`urn:stalwart:jmap`): password, 2FA, app passwords. */
	security: boolean;
}

const STALWART_URN = 'urn:stalwart:jmap';

type Capabilities = Pick<
	JMAPClient,
	'hasCalendars' | 'hasContacts' | 'hasFileNode' | 'hasSieve' | 'hasVacationResponse' | 'hasPrincipals' | 'getSession'
>;

export function featuresOf(client: Capabilities): Features {
	const session = client.getSession();
	return {
		calendars: client.hasCalendars(),
		contacts: client.hasContacts(),
		files: client.hasFileNode(),
		rules: client.hasSieve(),
		autoReply: client.hasVacationResponse(),
		sharing: client.hasPrincipals(),
		// Stalwart lists it per account (and in primaryAccounts), not on the session.
		security: Boolean(session?.capabilities?.[STALWART_URN] || session?.primaryAccounts?.[STALWART_URN])
	};
}

/** The pages that need a capability; everything else is mail and always there. */
const NEEDS: Record<string, keyof Features> = {
	'/calendar': 'calendars',
	'/contacts': 'contacts',
	'/files': 'files',
	'/settings/rules': 'rules',
	'/settings/auto-reply': 'autoReply',
	'/settings/sharing': 'sharing',
	'/settings/security': 'security',
	'/settings/app-passwords': 'security'
};

/** Whether to link to `href`. Unknown features (the server could not be asked) show everything. */
export function offered(href: string, features: Features | null | undefined): boolean {
	const need = NEEDS[href];
	return !need || !features || features[need];
}
