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

const octets = new TextEncoder();
/**
 * No line longer than 75 octets (RFC 6350 §3.2): what is over goes on lines
 * that start with a space, which a reader takes off again. Counted in bytes,
 * as the rule is, and never through the middle of a character.
 */
function fold(line: string): string {
	let folded = '';
	let width = 0;
	for (const char of line) {
		const size = octets.encode(char).length;
		if (width + size > 75) {
			folded += '\r\n ';
			width = 1;
		}
		folded += char;
		width += size;
	}
	return folded;
}

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
				.filter((line) => typeof line === 'string' && line !== '')
				.map((line) => fold(line as string))
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
function decodeQuotedPrintable(value: string, decoder: TextDecoder): string {
	return value.replace(/(?:=[0-9a-f]{2})+/gi, (run) =>
		decoder.decode(Uint8Array.from(run.slice(1).split('='), (hex) => parseInt(hex, 16)))
	);
}

/** The decoder a line's `CHARSET=` names, or the fallback when it names none or one this browser does not know. */
function decoderFor(charset: string | undefined, fallback: string): TextDecoder {
	try {
		return new TextDecoder(charset || fallback);
	} catch {
		return new TextDecoder(fallback);
	}
}

export interface VCardFile {
	cards: ContactInput[];
	/** Cards the file ends in the middle of (0 or 1): not read, since nothing says they are whole. */
	cutOff: number;
	/** Addresses left out of their cards because they are not e-mail addresses. */
	badEmails: number;
}

export const parseVCards = (text: string): ContactInput[] => readVCards(text).cards;

/**
 * A .vcf as it was picked: its bytes, or text already decoded. Bytes are read
 * as UTF-8; a file that is not valid UTF-8 (an old phone's or Outlook's
 * export) is read line by line instead, each in the `CHARSET=` it names and
 * otherwise as Windows-1252, the usual one for such files.
 */
export function readVCards(file: string | Uint8Array): VCardFile {
	let text: string;
	let bytewise = false;
	const utf8 = (bytes: Uint8Array) => new TextDecoder('utf-8', { fatal: true }).decode(bytes);
	// A file cut in the middle of a letter is still UTF-8, short of its last byte or three.
	const cut = (bytes: Uint8Array) => {
		for (const drop of [1, 2, 3]) {
			try {
				return utf8(bytes.subarray(0, -drop));
			} catch {
				// not there: one byte more
			}
		}
		throw new Error('not UTF-8');
	};
	if (typeof file === 'string') text = file;
	else if (file[0] === 0xff && file[1] === 0xfe) text = new TextDecoder('utf-16le').decode(file);
	else if (file[0] === 0xfe && file[1] === 0xff) text = new TextDecoder('utf-16be').decode(file);
	else {
		try {
			try {
				text = utf8(file);
			} catch {
				text = cut(file);
			}
		} catch {
			// A character a byte, so the line structure can be read before any charset is known.
			bytewise = true;
			text = '';
			for (const byte of file) text += String.fromCharCode(byte);
		}
	}
	const lines = text
		// A quoted-printable value folds its own way: a `=` ending the line carries it onto the next.
		.replace(/^([^:\r\n]*quoted-printable[^:\r\n]*:)((?:.*=\r?\n)+)/gim, (_, head: string, body: string) => head + body.replace(/=\r?\n/g, ''))
		// Then unfold: a line that starts with a space or a tab continues the one before.
		.replace(/\r?\n[ \t]/g, '')
		.split(/\r?\n/);
	const cards: ContactInput[] = [];
	let badEmails = 0;
	let card: ContactInput | null = null;
	let fullName = '';
	for (const line of lines) {
		const colon = line.indexOf(':');
		if (colon < 0) continue;
		const [head = '', ...params] = line.slice(0, colon).split(';');
		// `item1.EMAIL` (Apple groups) is EMAIL.
		const name = head.replace(/^[^.]*\./, '').toUpperCase();
		let value = line.slice(colon + 1);
		const charset = params.find((param) => /^charset=/i.test(param))?.slice(8);
		if (params.some((param) => /^(encoding=)?quoted-printable$/i.test(param))) {
			value = decodeQuotedPrintable(value, decoderFor(charset, bytewise ? 'windows-1252' : 'utf-8'));
		} else if (bytewise) {
			value = decoderFor(charset, 'windows-1252').decode(Uint8Array.from(value, (char) => char.charCodeAt(0)));
		}
		// The card before is done at its END — or, in a file that lost one, where the next begins.
		if ((name === 'BEGIN' || name === 'END') && card) {
			// A card with only FN still has a name.
			if (!card.given && !card.surname) card.given = fullName.slice(0, 200);
			// Saving drops what is not an address without a word; dropped here, it is counted.
			const emails = card.emails.filter((email) => /^[^\s@]+@[^\s@]+$/.test(email.address));
			badEmails += card.emails.length - emails.length;
			card.emails = emails;
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
	return { cards, cutOff: card ? 1 : 0, badEmails };
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
