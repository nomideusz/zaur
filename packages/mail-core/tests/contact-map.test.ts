import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
	buildContactCard,
	buildContactPatch,
	contactLetter,
	contactMatches,
	mapAddressBook,
	mapContactCard
} from '../src/jmap/contact-map.ts';
import type { JMAPContactCard } from '../src/jmap/contact-types.ts';

const card: JMAPContactCard = {
	id: 'c1',
	addressBookIds: { book: true, old: false },
	uid: 'urn:uuid:1',
	name: {
		components: [
			{ kind: 'given', value: 'Ada' },
			{ kind: 'surname', value: 'Lovelace' }
		]
	},
	emails: {
		w: { address: 'ada@work.example', contexts: { work: true }, pref: 2 },
		h: { address: 'ada@home.example', contexts: { private: true }, pref: 1 },
		x: { address: '   ' }
	},
	phones: { p: { number: '+44 20 7946 0000', label: 'Office' } },
	organizations: { o: { name: 'Analytical Engines' } },
	titles: { t: { name: 'Mathematician' } },
	nicknames: { n: { name: 'Countess' } },
	notes: { a: { note: 'First.' }, b: { note: 'Second.' } },
	updated: '2026-09-01T00:00:00Z'
};

test('mapContactCard flattens a JSContact card, preferred email first', () => {
	const contact = mapContactCard(card, 'acc');
	assert.equal(contact.name, 'Ada Lovelace');
	assert.equal(contact.given, 'Ada');
	assert.equal(contact.surname, 'Lovelace');
	assert.deepEqual(contact.addressBookIds, ['book']);
	assert.deepEqual(
		contact.emails.map((email) => [email.address, email.label, email.preferred]),
		[
			['ada@home.example', 'private', true],
			['ada@work.example', 'work', false]
		]
	);
	assert.deepEqual(contact.phones, [{ number: '+44 20 7946 0000', label: 'Office', preferred: true }]);
	assert.equal(contact.organization, 'Analytical Engines');
	assert.equal(contact.title, 'Mathematician');
	assert.equal(contact.nickname, 'Countess');
	assert.equal(contact.note, 'First.\n\nSecond.');
	assert.equal(contact.accountId, 'acc');
	assert.equal(contact.updated, '2026-09-01T00:00:00Z');
});

test('mapContactCard prefers the full name and falls back through org and email', () => {
	assert.equal(
		mapContactCard({ id: 'a', name: { full: 'A. Lovelace', components: [{ kind: 'given', value: 'Ada' }] } }).name,
		'A. Lovelace'
	);
	assert.equal(mapContactCard({ id: 'b', organizations: { o: { name: 'Acme' } } }).name, 'Acme');
	assert.equal(mapContactCard({ id: 'c', emails: { e: { address: 'x@y.z' } } }).name, 'x@y.z');
	assert.equal(mapContactCard({ id: 'd' }).name, '');
});

test('buildContactCard writes a versioned Card with only the filled properties', () => {
	const built = buildContactCard(
		{
			given: ' Ada ',
			surname: 'Lovelace',
			nickname: '',
			organization: 'Acme',
			title: '',
			emails: [
				{ address: 'ada@acme.example', label: 'work' },
				{ address: 'not-an-email', label: '' },
				{ address: 'ada@home.example', label: 'Home' }
			],
			phones: [{ number: '', label: '' }],
			note: ''
		},
		'book1',
		'urn:uuid:new'
	);
	assert.equal(built['@type'], 'Card');
	assert.equal(built.version, '1.0');
	assert.equal(built.uid, 'urn:uuid:new');
	assert.deepEqual(built.addressBookIds, { book1: true });
	assert.deepEqual(built.name, {
		'@type': 'Name',
		isOrdered: true,
		components: [
			{ '@type': 'NameComponent', kind: 'given', value: 'Ada' },
			{ '@type': 'NameComponent', kind: 'surname', value: 'Lovelace' }
		]
	});
	assert.deepEqual(built.emails, {
		e1: { '@type': 'EmailAddress', address: 'ada@acme.example', pref: 1, contexts: { work: true } },
		e2: { '@type': 'EmailAddress', address: 'ada@home.example', contexts: { private: true } }
	});
	assert.equal('phones' in built, false);
	assert.equal('titles' in built, false);
	assert.deepEqual(built.organizations, { o1: { '@type': 'Organization', name: 'Acme' } });
});

test('buildContactPatch nulls what was cleared so an update removes it', () => {
	const patch = buildContactPatch({
		given: 'Ada',
		surname: '',
		nickname: '',
		organization: '',
		title: '',
		emails: [],
		phones: [{ number: '+1 555', label: 'mobile' }],
		note: 'hi'
	});
	assert.equal(patch.emails, null);
	assert.equal(patch.organizations, null);
	assert.deepEqual(patch.phones, {
		p1: { '@type': 'Phone', number: '+1 555', pref: 1, label: 'mobile' }
	});
	assert.deepEqual(patch.notes, { note1: { '@type': 'Note', note: 'hi' } });
});

test('mapAddressBook reads rights with permissive defaults', () => {
	const book = mapAddressBook({ id: 'b', name: ' Personal ', myRights: { mayWrite: false } }, 'acc');
	assert.equal(book.name, 'Personal');
	assert.equal(book.mayWrite, false);
	assert.equal(book.mayDelete, true);
	assert.equal(book.isSubscribed, true);
	assert.equal(mapAddressBook({ id: 'x', name: '' }).name, 'Contacts');
});

test('contactLetter files non-letters under #', () => {
	const contact = mapContactCard(card);
	assert.equal(contactLetter(contact), 'A');
	assert.equal(contactLetter({ name: '42 Ltd', emails: [], organization: '' }), '#');
	assert.equal(contactLetter({ name: '', emails: [{ address: 'zed@x.y', label: '', preferred: true }], organization: '' }), 'Z');
});

test('contactMatches is a prefix match on words and addresses', () => {
	const contact = mapContactCard(card);
	assert.equal(contactMatches(contact, 'lov'), true);
	assert.equal(contactMatches(contact, 'ada@ho'), true);
	assert.equal(contactMatches(contact, 'analytical'), true);
	assert.equal(contactMatches(contact, 'count'), true);
	assert.equal(contactMatches(contact, 'velace'), false);
	assert.equal(contactMatches(contact, ''), true);
});
