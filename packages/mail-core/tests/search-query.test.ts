import { test } from 'node:test';
import assert from 'node:assert/strict';

import { allOf, parseSearchQuery } from '../src/mail/search-query.ts';

test('a bare query is a text filter', () => {
	assert.deepEqual(parseSearchQuery('dkim rotation').filter, { text: 'dkim rotation' });
	assert.deepEqual(parseSearchQuery('  ').filter, { text: '' });
});

test('one operator is one condition, not wrapped', () => {
	assert.deepEqual(parseSearchQuery('from:ada').filter, { from: 'ada' });
	assert.deepEqual(parseSearchQuery('has:attachment').filter, { hasAttachment: true });
	assert.deepEqual(parseSearchQuery('is:unseen').filter, { notKeyword: '$seen' });
	assert.deepEqual(parseSearchQuery('is:flagged').filter, { hasKeyword: '$flagged' });
});

test('several conditions combine through an RFC 8620 FilterOperator', () => {
	// `{ and: [...] }` is not JMAP; a server rejects it and the search reads as empty.
	const { filter, terms } = parseSearchQuery('from:ada subject:"reader spacing" measure');
	assert.deepEqual(filter, {
		operator: 'AND',
		conditions: [{ from: 'ada' }, { subject: 'reader spacing' }, { text: 'measure' }]
	});
	assert.deepEqual(terms, ['measure']);
	assert.equal('and' in filter, false);
});

test('allOf leaves a single condition alone and combines the rest', () => {
	assert.deepEqual(allOf([{ inMailbox: 'inbox' }]), { inMailbox: 'inbox' });
	assert.deepEqual(allOf([{ inMailbox: 'inbox' }, { text: 'dkim' }]), {
		operator: 'AND',
		conditions: [{ inMailbox: 'inbox' }, { text: 'dkim' }]
	});
});

test('date operators go over as ISO instants at the edges of the day', () => {
	assert.deepEqual(parseSearchQuery('after:2026-09-01').filter, { after: '2026-09-01T00:00:00.000Z' });
	assert.deepEqual(parseSearchQuery('before:2026-09-01').filter, { before: '2026-09-01T23:59:59.999Z' });
});

test('an unknown operator value falls back to text', () => {
	assert.deepEqual(parseSearchQuery('has:wings').filter, { text: 'has:wings' });
});
