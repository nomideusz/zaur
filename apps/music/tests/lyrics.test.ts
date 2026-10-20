import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseLrc } from '../src/lib/server/lyrics.ts';

test('LRC lines come out timed, in order, a repeated line once per stamp', () => {
	const lrc = '[ar:Someone]\n[00:12.50] First\n[01:02.00][00:20.25]Chorus\n[00:30.00]\n';
	assert.deepEqual(parseLrc(lrc), [
		{ start: 12500, text: 'First' },
		{ start: 20250, text: 'Chorus' },
		{ start: 30000, text: '' },
		{ start: 62000, text: 'Chorus' }
	]);
});
