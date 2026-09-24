import { test } from 'node:test';
import assert from 'node:assert/strict';

import { LABEL_FILTERS, filterKeyword, filterName } from '../src/lib/mail/labels.ts';

test('labels: each filter narrows to the keyword the message carries', () => {
	assert.equal(filterKeyword('all'), undefined);
	assert.equal(filterKeyword('unseen'), undefined);
	assert.equal(filterKeyword('flagged'), '$flagged');
	assert.equal(filterKeyword('important'), '$important');
	assert.equal(filterKeyword('cat:receipts'), 'cat.receipts');
});

test('labels: the sidebar lists every label once, each with a keyword and a name', () => {
	assert.deepEqual(LABEL_FILTERS.slice(0, 2), ['important', 'flagged']);
	assert.ok(!LABEL_FILTERS.includes('cat:other'), '"Other" is nothing in particular');
	assert.equal(new Set(LABEL_FILTERS).size, LABEL_FILTERS.length);
	for (const label of LABEL_FILTERS) assert.ok(filterKeyword(label), label);
	assert.equal(filterName('cat:receipts'), 'Receipts');
	assert.equal(filterName('important'), 'Important');
});
