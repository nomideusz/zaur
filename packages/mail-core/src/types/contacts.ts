/**
 * The contact the UI works with: JSContact (RFC 9553) flattened to what a
 * mail client shows and edits. The full card stays on the server; what is not
 * modelled here is preserved through an update because updates are patches.
 */
export interface ContactEmail {
	address: string;
	/** "work", "home", a label — whatever the card said; '' when none. */
	label: string;
	preferred: boolean;
}

export interface ContactPhone {
	number: string;
	label: string;
	preferred: boolean;
}

export interface Contact {
	id: string;
	/** JMAP account the card lives in (own or shared address book). */
	accountId: string | null;
	uid: string;
	addressBookIds: string[];
	/** The name as one string — the card's `full`, else assembled from parts. */
	name: string;
	given: string;
	surname: string;
	nickname: string;
	organization: string;
	title: string;
	emails: ContactEmail[];
	phones: ContactPhone[];
	note: string;
	/** ISO timestamps when the server provided them. */
	created: string | null;
	updated: string | null;
}

/** What the editor submits; the map layer turns it into a JSContact patch. */
export interface ContactInput {
	given: string;
	surname: string;
	nickname: string;
	organization: string;
	title: string;
	emails: { address: string; label: string }[];
	phones: { number: string; label: string }[];
	note: string;
}

export interface AddressBook {
	id: string;
	accountId: string | null;
	name: string;
	description: string;
	isDefault: boolean;
	isSubscribed: boolean;
	mayWrite: boolean;
	mayDelete: boolean;
}
