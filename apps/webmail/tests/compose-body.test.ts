import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isComposeBodyEmpty, stripQuotedReply } from '../src/lib/mail/compose-body.ts';

describe('stripQuotedReply', () => {
	it('removes the quoted original from replies', () => {
		assert.equal(stripQuotedReply('Reply text\n\n---\nQuoted lines'), 'Reply text');
	});

	it('leaves bodies without a quote untouched', () => {
		assert.equal(stripQuotedReply('Hello\nthere'), 'Hello\nthere');
	});
});

describe('isComposeBodyEmpty', () => {
	it('treats signature-only bodies as empty', () => {
		assert.equal(isComposeBodyEmpty('\n\n-- \nBest,\nNom'), true);
		assert.equal(isComposeBodyEmpty('-- \nBest,\nNom'), true);
		assert.equal(isComposeBodyEmpty('--\nBest,\nNom'), true);
	});

	it('treats signature plus quote as empty', () => {
		assert.equal(isComposeBodyEmpty('\n\n-- \nBest,\nNom\n\n---\nQuoted reply'), true);
	});

	it('treats message plus signature as non-empty', () => {
		assert.equal(isComposeBodyEmpty('Hello\n\n-- \nBest,\nNom'), false);
	});

	it('treats whitespace-only bodies as empty', () => {
		assert.equal(isComposeBodyEmpty(''), true);
		assert.equal(isComposeBodyEmpty('  \n\n '), true);
	});

	it('does not confuse the quote marker (---) with the signature delimiter', () => {
		assert.equal(isComposeBodyEmpty('Message\n\n---\nQuoted'), false);
	});
});
