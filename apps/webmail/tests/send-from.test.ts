import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveSendFrom } from '../src/lib/mail/send-from.ts';

const identities = [
	{ id: '1', name: 'Primary', email: 'me@example.com' },
	{ id: '2', name: 'Sales', email: 'Sales@Example.com' }
];

describe('resolveSendFrom', () => {
	it('falls back to the primary address when nothing is selected', () => {
		const resolved = resolveSendFrom('', 'me@example.com', identities);
		assert.equal(resolved.email, 'me@example.com');
		assert.equal(resolved.identity?.id, '1');
	});

	it('resolves a selected alias to its identity with canonical casing', () => {
		const resolved = resolveSendFrom('sales@example.com', 'me@example.com', identities);
		assert.equal(resolved.email, 'Sales@Example.com');
		assert.equal(resolved.identity?.id, '2');
	});

	it('keeps the raw selection when no identity matches', () => {
		const resolved = resolveSendFrom('other@example.com', 'me@example.com', identities);
		assert.equal(resolved.email, 'other@example.com');
		assert.equal(resolved.identity, undefined);
	});
});
