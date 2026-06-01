import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	ensureBodyIncludesSignature,
	isComposeBodyEmpty
} from '../src/lib/mail/compose-body.ts';

describe('ensureBodyIncludesSignature', () => {
	const opts = { useSignature: true, signature: 'Best,\nNom' };

	it('appends signature to a message-only body', () => {
		assert.equal(
			ensureBodyIncludesSignature('Hello there', opts),
			'Hello there\n\nBest,\nNom'
		);
	});

	it('keeps an existing signature block', () => {
		const body = 'Hello there\n\nBest,\nNom';
		assert.equal(ensureBodyIncludesSignature(body, opts), body);
	});

	it('preserves quoted replies after the signature', () => {
		const body = 'Reply text\n\n---\nQuoted';
		assert.equal(
			ensureBodyIncludesSignature(body, opts),
			'Reply text\n\nBest,\nNom\n\n---\nQuoted'
		);
	});

	it('adds signature when the compose UI only stored the message', () => {
		assert.equal(ensureBodyIncludesSignature('\n\nBest,\nNom', opts), '\n\nBest,\nNom');
	});
});

describe('isComposeBodyEmpty', () => {
	const opts = { useSignature: true, signature: 'Best,\nNom' };

	it('treats signature-only bodies as empty', () => {
		assert.equal(isComposeBodyEmpty('\n\nBest,\nNom', opts), true);
		assert.equal(isComposeBodyEmpty('Best,\nNom', opts), true);
	});

	it('treats message plus signature as non-empty', () => {
		assert.equal(isComposeBodyEmpty('Hello\n\nBest,\nNom', opts), false);
	});
});
