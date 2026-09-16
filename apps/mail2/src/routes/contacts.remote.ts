/**
 * Contacts, from a real source: the account's address books over JMAP for
 * Contacts (RFC 9610). Compose autocomplete used to scrape senders out of
 * whichever folder page was loaded and forgot everyone else; now it reads the
 * same cards CardDAV clients on the phone do.
 *
 * The whole directory (capped) comes down in one query and is filtered on the
 * client. Stalwart's `ContactCard/query` `text` filter matches whole tokens,
 * which is the wrong shape for autocomplete — "an" has to find Anders while
 * it is still being typed — and a personal address book is small.
 */
import { randomUUID } from 'node:crypto';
import * as v from 'valibot';
import { error } from '@sveltejs/kit';
import { command, query } from '$app/server';
import {
	JmapMethodError,
	buildContactCard,
	buildContactPatch,
	contactDisplayName,
	mapAddressBook,
	mapContactCard,
	type AddressBook,
	type Contact,
	type ContactInput
} from '@zaur/mail-core';
import { connect } from '#lib/server/account';

const MAX_CONTACTS = 2000;

export interface ContactsState {
	/** False when the server does not advertise `urn:ietf:params:jmap:contacts`. */
	supported: boolean;
	addressBooks: AddressBook[];
	contacts: Contact[];
	/** True when the cap was hit, so the list is known to be incomplete. */
	truncated: boolean;
}

function sortContacts(list: Contact[]): Contact[] {
	const collator = new Intl.Collator(undefined, { sensitivity: 'base' });
	return [...list].sort(
		(a, b) =>
			collator.compare(contactDisplayName(a), contactDisplayName(b)) || a.id.localeCompare(b.id)
	);
}

export const contacts = query(async (): Promise<ContactsState> => {
	const client = await connect();
	if (!client.hasContacts()) {
		return { supported: false, addressBooks: [], contacts: [], truncated: false };
	}
	const [books, cards] = await Promise.all([
		client.getAddressBooks(),
		client.getContactCards({ limit: MAX_CONTACTS })
	]);
	return {
		supported: true,
		addressBooks: books.map((book) => mapAddressBook(book)),
		contacts: sortContacts(cards.map((card) => mapContactCard(card))),
		truncated: cards.length >= MAX_CONTACTS
	};
});

const contactInput = v.object({
	given: v.pipe(v.string(), v.maxLength(200)),
	surname: v.pipe(v.string(), v.maxLength(200)),
	nickname: v.pipe(v.string(), v.maxLength(200)),
	organization: v.pipe(v.string(), v.maxLength(200)),
	title: v.pipe(v.string(), v.maxLength(200)),
	emails: v.pipe(
		v.array(
			v.object({
				address: v.pipe(v.string(), v.trim(), v.maxLength(254)),
				label: v.pipe(v.string(), v.maxLength(40))
			})
		),
		v.maxLength(20)
	),
	phones: v.pipe(
		v.array(
			v.object({
				number: v.pipe(v.string(), v.trim(), v.maxLength(60)),
				label: v.pipe(v.string(), v.maxLength(40))
			})
		),
		v.maxLength(20)
	),
	note: v.pipe(v.string(), v.maxLength(4000))
}) satisfies v.GenericSchema<ContactInput>;

function hasSomething(input: ContactInput): boolean {
	return Boolean(
		input.given.trim() ||
			input.surname.trim() ||
			input.organization.trim() ||
			input.emails.some((email) => email.address.includes('@'))
	);
}

function rethrow(cause: unknown): never {
	if (cause instanceof JmapMethodError) error(400, cause.message);
	throw cause;
}

/**
 * Create or update. A new contact goes into `addressBookId`, or the default
 * (first writable) book when none is given. Updates are patches, so the
 * properties this editor does not know about survive.
 */
export const saveContact = command(
	v.object({
		id: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(200))),
		accountId: v.optional(v.nullable(v.pipe(v.string(), v.maxLength(200)))),
		addressBookId: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(200))),
		contact: contactInput
	}),
	async ({ id, accountId, addressBookId, contact }): Promise<{ id: string }> => {
		if (!hasSomething(contact)) error(400, 'A contact needs a name, an organisation or an email address');
		const client = await connect();
		if (!client.hasContacts()) error(501, 'This server does not support contacts');
		try {
			if (id) {
				await client.updateContactCard(id, buildContactPatch(contact), accountId ?? null);
				void contacts().refresh();
				return { id };
			}
			let bookId = addressBookId;
			if (!bookId) {
				const books = (await client.getAddressBooks()).filter(
					(book) => book.myRights?.mayWrite !== false && (book.accountId ?? client.getContactAccountId()) === client.getContactAccountId()
				);
				bookId = (books.find((book) => book.isDefault) ?? books[0])?.id;
				if (!bookId) bookId = await client.createAddressBook({ name: 'Contacts' });
			}
			const created = await client.createContactCard(
				buildContactCard(contact, bookId, `urn:uuid:${randomUUID()}`),
				accountId ?? null
			);
			void contacts().refresh();
			return { id: created };
		} catch (cause) {
			rethrow(cause);
		}
	}
);

export const deleteContact = command(
	v.object({
		id: v.pipe(v.string(), v.minLength(1), v.maxLength(200)),
		accountId: v.optional(v.nullable(v.pipe(v.string(), v.maxLength(200))))
	}),
	async ({ id, accountId }): Promise<{ ok: true }> => {
		const client = await connect();
		try {
			await client.destroyContactCard(id, accountId ?? null);
		} catch (cause) {
			rethrow(cause);
		}
		void contacts().refresh();
		return { ok: true };
	}
);
