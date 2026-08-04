import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	collectsFromMailbox,
	ownAddressSet,
	threadInvolvesOwner
} from '../src/lib/mail/contact-collection.ts';

describe('collectsFromMailbox', () => {
	it('harvests Sent and nothing else', () => {
		assert.equal(collectsFromMailbox('sent'), true);
		for (const role of ['inbox', 'archive', 'drafts', 'junk', 'trash'] as const) {
			assert.equal(collectsFromMailbox(role), false, `${role} must not be harvested`);
		}
		assert.equal(collectsFromMailbox(undefined), false);
	});
});

describe('ownAddressSet', () => {
	it('normalises case and whitespace, dropping blanks', () => {
		const own = ownAddressSet([' Me@Zaur.app ', '', null, undefined, 'alias@zaur.app']);
		assert.deepEqual([...own].sort(), ['alias@zaur.app', 'me@zaur.app']);
	});
});

describe('threadInvolvesOwner', () => {
	const own = ownAddressSet(['me@zaur.app']);

	it('is true once a message came from one of our addresses', () => {
		const thread = [
			{ from: { email: 'friend@example.com' } },
			{ from: { email: 'ME@zaur.app' } }
		];
		assert.equal(threadInvolvesOwner(thread, own), true);
	});

	it('is false for a thread we only received — spam stays unfiled', () => {
		const thread = [{ from: { email: 'spammer@example.com' } }];
		assert.equal(threadInvolvesOwner(thread, own), false);
	});

	it('is false when the account has no known addresses yet', () => {
		const thread = [{ from: { email: 'me@zaur.app' } }];
		assert.equal(threadInvolvesOwner(thread, new Set()), false);
	});

	it('tolerates missing senders', () => {
		assert.equal(threadInvolvesOwner([{ from: null }, {}], own), false);
	});
});
