/**
 * Just enough vCard to move an address book in or out: the fields the contact
 * editor has — name, nickname, organisation, title, emails, phones, a note.
 * Written as 3.0, which Google, iCloud and Thunderbird all read; read from
 * 2.1, 3.0 or 4.0. Photos, addresses and birthdays are not carried.
 */
import { contactDisplayName } from '@zaur/mail-core';
import type { Contact, ContactInput } from '@zaur/mail-core';

const escape = (text: string) => text.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/[,;]/g, '\\$&');
const unescape = (text: string) => text.replace(/\\([nN\\,;])/g, (_, char: string) => (char.toLowerCase() === 'n' ? '\n' : char));
/** A structured value (`N`, `ORG`) at its unescaped semicolons. */
const parts = (value: string) => value.split(/(?<!\\);/).map((part) => unescape(part).trim());
// JSContact's "private" is every other address book's "home".
const typed = (label: string) =>
	label.trim() ? `;TYPE=${label.trim().replace(/^private$/i, 'home').replace(/[^\w-]+/g, '-')}` : '';

export function toVCards(contacts: Contact[]): string {
	return contacts
		.map((contact) =>
			[
				'BEGIN:VCARD',
				'VERSION:3.0',
				`FN:${escape(contactDisplayName(contact))}`,
				`N:${escape(contact.surname)};${escape(contact.given)};;;`,
				contact.nickname && `NICKNAME:${escape(contact.nickname)}`,
				contact.organization && `ORG:${escape(contact.organization)}`,
				contact.title && `TITLE:${escape(contact.title)}`,
				...contact.emails.map((email) => `EMAIL${typed(email.label)}:${escape(email.address)}`),
				...contact.phones.map((phone) => `TEL${typed(phone.label)}:${escape(phone.number)}`),
				contact.note && `NOTE:${escape(contact.note)}`,
				contact.uid && `UID:${escape(contact.uid)}`,
				'END:VCARD'
			]
				.filter(Boolean)
				.join('\r\n')
		)
		.join('\r\n')
		.concat('\r\n');
}

/** `TYPE=WORK,INTERNET`, `type=home;type=pref`, or 2.1's bare `CELL`: the first word that says something. */
function labelOf(params: string[]): string {
	const words = params
		.filter((param) => !param.includes('=') || /^type=/i.test(param))
		.flatMap((param) => param.replace(/^type=/i, '').replace(/"/g, '').split(','))
		.map((word) => word.trim().toLowerCase())
		.filter((word) => word && !['internet', 'pref', 'voice', 'quoted-printable'].includes(word));
	return (words[0] ?? '').slice(0, 40);
}

/**
 * 2.1's quoted-printable — what Android writes for any name that is not ASCII:
 * `=C5=BB` are bytes in the line's CHARSET (UTF-8 when it names none, or one
 * this browser does not know). A character's bytes always sit in one run.
 */
function decodeQuotedPrintable(value: string, charset = 'utf-8'): string {
	let decoder: TextDecoder;
	try {
		decoder = new TextDecoder(charset);
	} catch {
		decoder = new TextDecoder();
	}
	return value.replace(/(?:=[0-9a-f]{2})+/gi, (run) =>
		decoder.decode(Uint8Array.from(run.slice(1).split('='), (hex) => parseInt(hex, 16)))
	);
}

export function parseVCards(text: string): ContactInput[] {
	const lines = text
		// A quoted-printable value folds its own way: a `=` ending the line carries it onto the next.
		.replace(/^([^:\r\n]*quoted-printable[^:\r\n]*:)((?:.*=\r?\n)+)/gim, (_, head: string, body: string) => head + body.replace(/=\r?\n/g, ''))
		// Then unfold: a line that starts with a space or a tab continues the one before.
		.replace(/\r?\n[ \t]/g, '')
		.split(/\r?\n/);
	const cards: ContactInput[] = [];
	let card: ContactInput | null = null;
	let fullName = '';
	for (const line of lines) {
		const colon = line.indexOf(':');
		if (colon < 0) continue;
		const [head = '', ...params] = line.slice(0, colon).split(';');
		// `item1.EMAIL` (Apple groups) is EMAIL.
		const name = head.replace(/^[^.]*\./, '').toUpperCase();
		let value = line.slice(colon + 1);
		if (params.some((param) => /^(encoding=)?quoted-printable$/i.test(param))) {
			value = decodeQuotedPrintable(value, params.find((param) => /^charset=/i.test(param))?.slice(8));
		}
		// The card before is done at its END — or, in a file that lost one, where the next begins.
		if ((name === 'BEGIN' || name === 'END') && card) {
			// A card with only FN still has a name.
			if (!card.given && !card.surname) card.given = fullName.slice(0, 200);
			cards.push(card);
			card = null;
		}
		if (name === 'BEGIN') {
			card = { given: '', surname: '', nickname: '', organization: '', title: '', emails: [], phones: [], note: '' };
			fullName = '';
		} else if (!card) {
			continue;
		} else if (name === 'FN') fullName = unescape(value).trim();
		else if (name === 'N') [card.surname = '', card.given = ''] = parts(value).map((part) => part.slice(0, 200));
		else if (name === 'NICKNAME') card.nickname = unescape(value).trim().slice(0, 200);
		else if (name === 'ORG') card.organization = (parts(value)[0] ?? '').slice(0, 200);
		else if (name === 'TITLE') card.title = unescape(value).trim().slice(0, 200);
		else if (name === 'NOTE') card.note = unescape(value).slice(0, 4000);
		else if (name === 'EMAIL' && card.emails.length < 20) card.emails.push({ address: unescape(value).trim(), label: labelOf(params) });
		// 4.0 writes numbers as `tel:` URIs.
		else if (name === 'TEL' && card.phones.length < 20) card.phones.push({ number: unescape(value).replace(/^tel:/i, '').trim(), label: labelOf(params) });
	}
	return cards;
}

/**
 * What makes two cards the same person for an import: any shared address, or,
 * for a card with no address, the same name.
 */
export function contactKeys(contact: Pick<ContactInput, 'given' | 'surname' | 'organization' | 'emails'>): string[] {
	const emails = contact.emails.map((email) => email.address.trim().toLowerCase()).filter((address) => address.includes('@'));
	if (emails.length) return emails;
	const name = (`${contact.given} ${contact.surname}`.trim() || contact.organization).trim().toLowerCase();
	return name ? [`name:${name}`] : [];
}
