import { test } from 'node:test';
import assert from 'node:assert/strict';

import type { Contact } from '@zaur/mail-core';
import { contactKeys, parseVCards, readVCards, toVCards } from '../src/lib/components/contacts/vcard.ts';

test('parseVCards reads 3.0 and 4.0 cards, folded lines, groups and escapes', () => {
	const cards = parseVCards(
		[
			'BEGIN:VCARD',
			'VERSION:3.0',
			'FN:Ada Lovelace',
			'N:Lovelace;Ada;;;',
			'ORG:Analytical Engines\\, Ltd;Research',
			'item1.EMAIL;TYPE=INTERNET,WORK:ada@example.com',
			'EMAIL;type=HOME;type=pref:ada@home.example',
			'TEL;CELL:+48 600 100 200',
			'NOTE:Line one\\nline two\\; still two and a long tail that a writer would fold',
			'  onto the next line',
			'END:VCARD',
			'BEGIN:VCARD',
			'VERSION:4.0',
			'FN:Only A Full Name',
			'TEL;VALUE=uri;TYPE="voice,home":tel:+1-555-0100',
			'END:VCARD'
		].join('\r\n')
	);
	assert.equal(cards.length, 2);
	assert.deepEqual(cards[0], {
		given: 'Ada',
		surname: 'Lovelace',
		nickname: '',
		organization: 'Analytical Engines, Ltd',
		title: '',
		emails: [
			{ address: 'ada@example.com', label: 'work' },
			{ address: 'ada@home.example', label: 'home' }
		],
		phones: [{ number: '+48 600 100 200', label: 'cell' }],
		note: 'Line one\nline two; still two and a long tail that a writer would fold onto the next line'
	});
	assert.equal(cards[1]!.given, 'Only A Full Name');
	assert.deepEqual(cards[1]!.phones, [{ number: '+1-555-0100', label: 'home' }]);
});

test('parseVCards decodes 2.1 quoted-printable values, soft line breaks and all', () => {
	// What Android's Contacts exports for "Żaneta Łukasz".
	const cards = parseVCards(
		[
			'BEGIN:VCARD',
			'VERSION:2.1',
			'N;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:=C5=81ukasz;=C5=BBaneta;;;',
			'FN;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:=C5=BBaneta =C5=81ukasz',
			'TEL;CELL:+48 600 100 200',
			'NOTE;ENCODING=QUOTED-PRINTABLE;CHARSET=UTF-8:Za=C5=BC=C3=B3=C5=82=C4=87 g=C4=99=C5=9Bl=C4=85 ja=C5=BA=C5=84, a line=',
			' long enough to be broken=0D=0Aand one that was meant',
			'END:VCARD',
			'BEGIN:VCARD',
			'VERSION:2.1',
			'FN;QUOTED-PRINTABLE;CHARSET=ISO-8859-2:=AFaneta',
			'EMAIL;INTERNET;QUOTED-PRINTABLE:zaneta=40example.com',
			'END:VCARD'
		].join('\r\n')
	);
	assert.equal(cards.length, 2);
	assert.equal(cards[0]!.given, 'Żaneta');
	assert.equal(cards[0]!.surname, 'Łukasz');
	assert.equal(cards[0]!.note, 'Zażółć gęślą jaźń, a line long enough to be broken\r\nand one that was meant');
	assert.deepEqual(cards[0]!.phones, [{ number: '+48 600 100 200', label: 'cell' }]);
	assert.equal(cards[1]!.given, 'Żaneta');
	assert.deepEqual(cards[1]!.emails, [{ address: 'zaneta@example.com', label: '' }]);
});

test('parseVCards keeps a card whose END line is missing', () => {
	const cards = parseVCards(
		['BEGIN:VCARD', 'FN:No End', 'EMAIL:noend@example.com', 'BEGIN:VCARD', 'FN:Second', 'END:VCARD', 'BEGIN:VCARD', 'FN:Cut Off'].join('\n')
	);
	assert.deepEqual(
		cards.map((card) => card.given),
		['No End', 'Second']
	);
});

test('toVCards writes what parseVCards reads back', () => {
	const contact: Contact = {
		id: 'c1',
		accountId: null,
		uid: 'urn:uuid:1',
		addressBookIds: ['b1'],
		name: 'Zoë Żółw',
		given: 'Zoë',
		surname: 'Żółw',
		nickname: 'Z',
		organization: 'Shell; Co',
		title: 'Tortoise, senior',
		emails: [{ address: 'zoe@example.com', label: 'work' }, { address: 'zoe@home.example', label: 'private' }],
		phones: [{ number: '+48 1', label: '' }],
		note: 'a\nb',
		created: null,
		updated: null
	} as Contact;
	const [back] = parseVCards(toVCards([contact]));
	assert.deepEqual(back, {
		given: 'Zoë',
		surname: 'Żółw',
		nickname: 'Z',
		organization: 'Shell; Co',
		title: 'Tortoise, senior',
		// "private" is JSContact's word; the file says "home", as other address books do.
		emails: [{ address: 'zoe@example.com', label: 'work' }, { address: 'zoe@home.example', label: 'home' }],
		phones: [{ number: '+48 1', label: '' }],
		note: 'a\nb'
	});
});

test('contactKeys matches on any address, or on the name when there is none', () => {
	assert.deepEqual(contactKeys({ given: 'Ada', surname: 'L', organization: '', emails: [{ address: ' Ada@Example.com ', label: '' }] }), ['ada@example.com']);
	assert.deepEqual(contactKeys({ given: 'Ada', surname: 'L', organization: '', emails: [] }), ['name:ada l']);
	assert.deepEqual(contactKeys({ given: '', surname: '', organization: '', emails: [{ address: 'nope', label: '' }] }), []);
});

test('readVCards reads bytes: UTF-8, or Windows-1252 and each line\'s CHARSET when the file is not UTF-8', () => {
	const bytes = (...chunks: (string | number[])[]) =>
		Uint8Array.from(chunks.flatMap((chunk) => (typeof chunk === 'string' ? [...new TextEncoder().encode(chunk)] : chunk)));
	// UTF-8, with the byte order mark Windows tools put in front.
	const utf8 = readVCards(bytes([0xef, 0xbb, 0xbf], 'BEGIN:VCARD\r\nFN:Żaneta Łoś\r\nEND:VCARD\r\n'));
	assert.equal(utf8.cards[0]!.given, 'Żaneta Łoś');
	// "Jörg Müller" as Outlook writes it: ö is F6, ü is FC — not UTF-8.
	// Cut in the middle of a letter: the cards before the cut are still UTF-8.
	const cut = readVCards(bytes('BEGIN:VCARD\nFN:Żółć Pierwszy\nEND:VCARD\nBEGIN:VCARD\nFN:Dr', [0xc3]));
	assert.equal(cut.cards[0]?.given, 'Żółć Pierwszy');
	const wide = readVCards(new Uint8Array([0xff, 0xfe, ...[...'BEGIN:VCARD\nFN:Ł\nEND:VCARD\n'].flatMap((c) => [c.charCodeAt(0) & 0xff, c.charCodeAt(0) >> 8])]));
	assert.equal(wide.cards[0]?.given, 'Ł');
	const latin = readVCards(bytes('BEGIN:VCARD\nFN:J', [0xf6], 'rg M', [0xfc], 'ller\nNOTE:5 ', [0x80], '\nEND:VCARD\n'));
	assert.equal(latin.cards[0]!.given, 'Jörg Müller');
	assert.equal(latin.cards[0]!.note, '5 €');
	// 2.1 naming its charset on the line: "Żółw" in ISO-8859-2 is AF F3 B3 77.
	const named = readVCards(bytes('BEGIN:VCARD\nN;CHARSET=ISO-8859-2:', [0xaf, 0xf3, 0xb3], 'w;Jan\nORG;CHARSET=nonsense:Caf', [0xe9], '\nEND:VCARD\n'));
	assert.equal(named.cards[0]!.surname, 'Żółw');
	assert.equal(named.cards[0]!.organization, 'Café');
});

test('readVCards counts what it leaves out: a card cut off at the end, an address that is not one', () => {
	const file = readVCards(
		[
			'BEGIN:VCARD', 'FN:Good', 'EMAIL:good@example.com', 'EMAIL:not an address', 'EMAIL:two@@example.com', 'END:VCARD',
			'BEGIN:VCARD', 'FN:Only Bad', 'EMAIL:nope', 'END:VCARD',
			'BEGIN:VCARD', 'FN:Cut Off', 'EMAIL:cut@example.com'
		].join('\n')
	);
	assert.deepEqual(file.cards.map((card) => [card.given, card.emails.map((email) => email.address)]), [
		['Good', ['good@example.com']],
		['Only Bad', []]
	]);
	assert.equal(file.cutOff, 1);
	assert.equal(file.badEmails, 3);
	assert.deepEqual(readVCards('BEGIN:VCARD\nFN:Whole\nEND:VCARD\n'), {
		cards: [{ given: 'Whole', surname: '', nickname: '', organization: '', title: '', emails: [], phones: [], note: '' }],
		cutOff: 0,
		badEmails: 0
	});
});

test('toVCards folds lines at 75 octets, never through a character, and reads them back', () => {
	const note = 'Zażółć gęślą jaźń — '.repeat(12) + '😀'.repeat(30);
	const contact = {
		id: 'c1', accountId: null, uid: '', addressBookIds: [], name: 'Long', given: 'Long', surname: '', nickname: '',
		organization: '', title: '', emails: [], phones: [], note, created: null, updated: null
	} as Contact;
	const file = toVCards([contact]);
	for (const line of file.split('\r\n')) {
		assert.ok(new TextEncoder().encode(line).length <= 75, `${new TextEncoder().encode(line).length} octets: ${line}`);
		assert.ok(!line.includes('\uFFFD'));
	}
	assert.equal(parseVCards(file)[0]!.note, note);
});
