import { test } from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_PREFS, LIST_MAX, LIST_MIN, parsePrefs } from '../src/lib/settings.ts';
import { selectedEmailIds } from '../src/lib/mail/rows.ts';
import type { MessagePreview } from '@zaur/mail-core';

test('parsePrefs falls back to defaults on missing or broken storage', () => {
	assert.deepEqual(parsePrefs(null), DEFAULT_PREFS);
	assert.deepEqual(parsePrefs('not json'), DEFAULT_PREFS);
	assert.deepEqual(parsePrefs('"a string"'), DEFAULT_PREFS);
});

test('parsePrefs merges known keys and rejects wrong types, unknown keys and bad ranges', () => {
	const prefs = parsePrefs(
		JSON.stringify({
			showPreview: false,
			pageSize: 'lots',
			listWidth: 9000,
			nonsense: true,
			markReadOnOpen: 'yes'
		})
	);
	assert.equal(prefs.showPreview, false);
	assert.equal(prefs.pageSize, DEFAULT_PREFS.pageSize, 'non-numeric page size falls back');
	assert.equal(prefs.listWidth, LIST_MAX, 'list width is clamped');
	assert.equal(prefs.markReadOnOpen, DEFAULT_PREFS.markReadOnOpen, 'wrong type is ignored');
	assert.ok(!('nonsense' in prefs));

	assert.equal(parsePrefs(JSON.stringify({ listWidth: 10 })).listWidth, LIST_MIN);
	assert.equal(parsePrefs(JSON.stringify({ pageSize: 37 })).pageSize, DEFAULT_PREFS.pageSize);
	assert.equal(parsePrefs(JSON.stringify({ pageSize: 100 })).pageSize, 100);
});

function preview(id: string, threadId: string): MessagePreview {
	return {
		id,
		threadId,
		mailboxId: 'inbox',
		from: { name: 'Ada', email: 'ada@example.com' },
		subject: 's',
		preview: 'p',
		receivedAt: new Date('2026-09-12T10:00:00Z').toISOString(),
		unread: false,
		starred: false,
		important: false,
		hasAttachment: false
	};
}

test('selectedEmailIds expands selected threads into every message they hold', () => {
	const rows = [preview('m1', 't1'), preview('m2', 't1'), preview('m3', 't2')];
	assert.deepEqual(selectedEmailIds(rows, new Set(['t1'])), ['m1', 'm2']);
	assert.deepEqual(selectedEmailIds(rows, new Set(['t1', 't2'])), ['m1', 'm2', 'm3']);
	assert.deepEqual(selectedEmailIds(rows, new Set()), []);
	assert.deepEqual(selectedEmailIds(undefined, new Set(['t1'])), []);
	assert.deepEqual(selectedEmailIds(rows, new Set(['gone'])), []);
});
