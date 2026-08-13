import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emailQueryHasMore } from '../src/jmap/email-query.ts';

test('hasMore uses total when the server provides it', () => {
	assert.equal(emailQueryHasMore({ position: 0, idCount: 20, limit: 20, total: 20 }), false);
	assert.equal(emailQueryHasMore({ position: 0, idCount: 20, limit: 20, total: 80 }), true);
	assert.equal(emailQueryHasMore({ position: 50, idCount: 20, limit: 20, total: 80 }), true);
	assert.equal(emailQueryHasMore({ position: 60, idCount: 20, limit: 20, total: 80 }), false);
});

test('hasMore treats a full page as incomplete when total is omitted', () => {
	assert.equal(emailQueryHasMore({ position: 0, idCount: 20, limit: 20 }), true);
	assert.equal(emailQueryHasMore({ position: 0, idCount: 19, limit: 20 }), false);
	assert.equal(emailQueryHasMore({ position: 20, idCount: 0, limit: 20 }), false);
});
