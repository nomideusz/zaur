/**
 * JSContact ↔ the contact the UI edits. Pure, unit-tested.
 *
 * Reading flattens the card; writing produces a JMAP *patch* for the handful
 * of properties this client owns, so a card that also carries addresses,
 * photos or anniversaries keeps them through an edit made here.
 */
import type {
	JMAPAddressBook,
	JMAPContactCard,
	JSContactEmail,
	JSContactNameComponent,
	JSContactPhone
} from './contact-types';
import type { AddressBook, Contact, ContactEmail, ContactInput, ContactPhone } from '../types/contacts';

function contextLabel(item: { contexts?: Record<string, boolean>; label?: string }): string {
	if (item.label?.trim()) return item.label.trim();
	const contexts = Object.entries(item.contexts ?? {})
		.filter(([, on]) => on)
		.map(([name]) => name);
	return contexts[0] ?? '';
}

function byPreference<T extends { pref?: number }>(entries: [string, T][]): [string, T][] {
	// RFC 9553 §1.5.4: lower `pref` wins, absent is last; stable on the id.
	return [...entries].sort(([aId, a], [bId, b]) => {
		const ap = a.pref ?? Number.MAX_SAFE_INTEGER;
		const bp = b.pref ?? Number.MAX_SAFE_INTEGER;
		return ap - bp || aId.localeCompare(bId);
	});
}

function nameParts(card: JMAPContactCard): { given: string; surname: string; full: string } {
	const components = card.name?.components ?? [];
	const part = (kind: JSContactNameComponent['kind']) =>
		components
			.filter((component) => component.kind === kind && component.value?.trim())
			.map((component) => component.value.trim())
			.join(' ');
	const given = part('given');
	const surname = part('surname');
	const full = card.name?.full?.trim() || [part('title'), given, part('given2'), surname, part('surname2')].filter(Boolean).join(' ');
	return { given, surname, full };
}

export function mapAddressBook(book: JMAPAddressBook, accountId?: string | null): AddressBook {
	return {
		id: book.id,
		accountId: accountId ?? book.accountId ?? null,
		name: book.name?.trim() || 'Contacts',
		description: book.description?.trim() ?? '',
		isDefault: !!book.isDefault,
		isSubscribed: book.isSubscribed !== false,
		mayWrite: book.myRights?.mayWrite !== false,
		mayDelete: book.myRights?.mayDelete !== false
	};
}

export function mapContactCard(card: JMAPContactCard, accountId?: string | null): Contact {
	const { given, surname, full } = nameParts(card);
	const emails: ContactEmail[] = byPreference(Object.entries(card.emails ?? {}))
		.filter(([, email]) => typeof email?.address === 'string' && email.address.trim())
		.map(([, email], index) => ({
			address: email.address.trim(),
			label: contextLabel(email),
			preferred: index === 0
		}));
	const phones: ContactPhone[] = byPreference(Object.entries(card.phones ?? {}))
		.filter(([, phone]) => typeof phone?.number === 'string' && phone.number.trim())
		.map(([, phone], index) => ({
			number: phone.number.trim(),
			label: contextLabel(phone),
			preferred: index === 0
		}));
	const organization = Object.values(card.organizations ?? {})
		.map((org) => org?.name?.trim())
		.find(Boolean);
	const title = Object.values(card.titles ?? {})
		.map((entry) => entry?.name?.trim())
		.find(Boolean);
	const nickname = Object.values(card.nicknames ?? {})
		.map((entry) => entry?.name?.trim())
		.find(Boolean);
	const note = Object.values(card.notes ?? {})
		.map((entry) => entry?.note?.trim())
		.filter(Boolean)
		.join('\n\n');

	return {
		id: card.id,
		accountId: accountId ?? card.accountId ?? null,
		uid: card.uid ?? '',
		addressBookIds: Object.entries(card.addressBookIds ?? {})
			.filter(([, on]) => on)
			.map(([id]) => id),
		name: full || organization || emails[0]?.address || '',
		given,
		surname,
		nickname: nickname ?? '',
		organization: organization ?? '',
		title: title ?? '',
		emails,
		phones,
		note,
		created: card.created ?? null,
		updated: card.updated ?? null
	};
}

const CONTEXTS = new Set(['private', 'work']);

function labelled<T extends { contexts?: Record<string, boolean>; label?: string }>(
	base: T,
	label: string
): T {
	const clean = label.trim().toLowerCase();
	if (!clean) return base;
	// "home" is what people type; JSContact's word for it is "private".
	const context = clean === 'home' ? 'private' : clean;
	return CONTEXTS.has(context) ? { ...base, contexts: { [context]: true } } : { ...base, label: label.trim() };
}

/**
 * The JSContact properties this client owns, as a full replacement for each of
 * them — used both for `create` (merged into a new Card) and for `update` (as
 * a patch that touches only these keys).
 */
export function contactProperties(input: ContactInput): Record<string, unknown> {
	const components: JSContactNameComponent[] = [];
	const given = input.given.trim();
	const surname = input.surname.trim();
	if (given) components.push({ '@type': 'NameComponent', kind: 'given', value: given });
	if (surname) components.push({ '@type': 'NameComponent', kind: 'surname', value: surname });

	const emails: Record<string, JSContactEmail> = {};
	input.emails
		.map((email) => ({ ...email, address: email.address.trim() }))
		.filter((email) => email.address.includes('@'))
		.forEach((email, index) => {
			emails[`e${index + 1}`] = labelled<JSContactEmail>(
				{ '@type': 'EmailAddress', address: email.address, ...(index === 0 ? { pref: 1 } : {}) },
				email.label
			);
		});

	const phones: Record<string, JSContactPhone> = {};
	input.phones
		.map((phone) => ({ ...phone, number: phone.number.trim() }))
		.filter((phone) => phone.number)
		.forEach((phone, index) => {
			phones[`p${index + 1}`] = labelled<JSContactPhone>(
				{ '@type': 'Phone', number: phone.number, ...(index === 0 ? { pref: 1 } : {}) },
				phone.label
			);
		});

	const organization = input.organization.trim();
	const title = input.title.trim();
	const nickname = input.nickname.trim();
	const note = input.note.trim();

	return {
		name: components.length
			? { '@type': 'Name', components, isOrdered: true }
			: null,
		emails: Object.keys(emails).length ? emails : null,
		phones: Object.keys(phones).length ? phones : null,
		organizations: organization ? { o1: { '@type': 'Organization', name: organization } } : null,
		titles: title ? { t1: { '@type': 'Title', name: title } } : null,
		nicknames: nickname ? { n1: { '@type': 'Nickname', name: nickname } } : null,
		notes: note ? { note1: { '@type': 'Note', note } } : null
	};
}

/** A whole new Card for `ContactCard/set` `create`. */
export function buildContactCard(
	input: ContactInput,
	addressBookId: string,
	uid: string
): Record<string, unknown> {
	const card: Record<string, unknown> = {
		'@type': 'Card',
		version: '1.0',
		uid,
		kind: 'individual',
		addressBookIds: { [addressBookId]: true }
	};
	for (const [key, value] of Object.entries(contactProperties(input))) {
		if (value !== null) card[key] = value;
	}
	return card;
}

/** A patch for `ContactCard/set` `update`: `null` removes what was cleared. */
export function buildContactPatch(input: ContactInput): Record<string, unknown> {
	return contactProperties(input);
}

/** Something to call a contact by when the card has no usable name. */
export function contactDisplayName(contact: Pick<Contact, 'name' | 'emails' | 'organization'>): string {
	return contact.name || contact.organization || contact.emails[0]?.address || 'Unnamed contact';
}

/** The letter a contact files under: A–Z, else '#'. */
export function contactLetter(contact: Pick<Contact, 'name' | 'emails' | 'organization'>): string {
	const letter = contactDisplayName(contact).trim().charAt(0).toUpperCase();
	return /[A-Z]/.test(letter) ? letter : '#';
}

/**
 * Does the contact match what was typed, on any prefix of any word of the
 * name, organisation, nickname or an address? Prefix rather than substring:
 * "an" should find Ana and Anders, not everyone with an "an" somewhere.
 */
export function contactMatches(
	contact: Pick<Contact, 'name' | 'given' | 'surname' | 'nickname' | 'organization' | 'emails'>,
	query: string
): boolean {
	const q = query.trim().toLowerCase();
	if (!q) return true;
	const haystack = [
		contact.name,
		contact.given,
		contact.surname,
		contact.nickname,
		contact.organization,
		...contact.emails.map((email) => email.address)
	]
		.join(' ')
		.toLowerCase();
	if (haystack.includes(q) && q.includes('@')) return true;
	return haystack
		.split(/[\s@._\-()]+/)
		.some((word) => word.startsWith(q)) || contact.emails.some((email) => email.address.toLowerCase().startsWith(q));
}
