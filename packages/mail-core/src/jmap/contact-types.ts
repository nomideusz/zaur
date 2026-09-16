/**
 * JMAP for Contacts (RFC 9610) over JSContact (RFC 9553) — the wire shapes,
 * limited to what this client reads and writes. Everything else on a card is
 * left alone: updates go out as patches, never as whole cards.
 */
export const CONTACTS_URN = 'urn:ietf:params:jmap:contacts';

export interface JMAPAddressBookRights {
	mayRead?: boolean;
	mayWrite?: boolean;
	mayShare?: boolean;
	mayDelete?: boolean;
}

export interface JMAPAddressBook {
	id: string;
	name: string;
	description?: string | null;
	sortOrder?: number;
	isDefault?: boolean;
	isSubscribed?: boolean;
	shareWith?: Record<string, JMAPAddressBookRights> | null;
	myRights?: JMAPAddressBookRights | null;
	/** Account this address book was fetched from (own or shared). */
	accountId?: string | null;
}

export const ADDRESS_BOOK_PROPERTIES = [
	'id',
	'name',
	'description',
	'sortOrder',
	'isDefault',
	'isSubscribed',
	'myRights',
	'shareWith'
] as const;

/** RFC 9553 §2.2.1 — one piece of a structured name. */
export interface JSContactNameComponent {
	'@type'?: 'NameComponent';
	kind: 'title' | 'given' | 'given2' | 'surname' | 'surname2' | 'credential' | 'generation' | 'separator';
	value: string;
}

export interface JSContactName {
	'@type'?: 'Name';
	components?: JSContactNameComponent[];
	full?: string;
	isOrdered?: boolean;
}

export interface JSContactEmail {
	'@type'?: 'EmailAddress';
	address: string;
	contexts?: Record<string, boolean>;
	pref?: number;
	label?: string;
}

export interface JSContactPhone {
	'@type'?: 'Phone';
	number: string;
	features?: Record<string, boolean>;
	contexts?: Record<string, boolean>;
	pref?: number;
	label?: string;
}

export interface JSContactOrganization {
	'@type'?: 'Organization';
	name?: string;
	units?: { name: string }[];
}

export interface JSContactTitle {
	'@type'?: 'Title';
	name: string;
	kind?: 'title' | 'role';
}

export interface JSContactNickname {
	'@type'?: 'Nickname';
	name: string;
}

export interface JSContactNote {
	'@type'?: 'Note';
	note: string;
}

/** A ContactCard: the JMAP envelope plus the JSContact Card it carries. */
export interface JMAPContactCard {
	id: string;
	addressBookIds?: Record<string, boolean>;
	'@type'?: 'Card';
	version?: string;
	uid?: string;
	kind?: string;
	created?: string;
	updated?: string;
	name?: JSContactName;
	nicknames?: Record<string, JSContactNickname>;
	organizations?: Record<string, JSContactOrganization>;
	titles?: Record<string, JSContactTitle>;
	emails?: Record<string, JSContactEmail>;
	phones?: Record<string, JSContactPhone>;
	notes?: Record<string, JSContactNote>;
	/** Account this card was fetched from (own or shared). */
	accountId?: string | null;
}

export const CONTACT_CARD_PROPERTIES = [
	'id',
	'addressBookIds',
	'uid',
	'kind',
	'created',
	'updated',
	'name',
	'nicknames',
	'organizations',
	'titles',
	'emails',
	'phones',
	'notes'
] as const;
