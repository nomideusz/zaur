import { test } from 'node:test';
import assert from 'node:assert/strict';

import type { Contact } from '@zaur/mail-core';
import { contactKeys, parseVCards, toVCards } from '../src/lib/components/contacts/vcard.ts';

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
