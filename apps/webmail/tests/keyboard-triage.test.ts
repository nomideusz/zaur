import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { selectStarFilter, triageMode } from '../src/lib/mail/keyboard-triage.ts';

describe('selectStarFilter', () => {
	it('maps Gmail-style star chords', () => {
		assert.equal(selectStarFilter('a'), 'all');
		assert.equal(selectStarFilter('A'), 'all');
		assert.equal(selectStarFilter('n'), 'none');
		assert.equal(selectStarFilter('u'), 'new');
		assert.equal(selectStarFilter('r'), 'normal');
		assert.equal(selectStarFilter('x'), null);
	});
});

describe('triageMode', () => {
	it('prefers selecting over reader', () => {
		assert.equal(triageMode({ hasThread: true, hasSelection: true }), 'selecting');
		assert.equal(triageMode({ hasThread: true, hasSelection: false }), 'reader');
		assert.equal(triageMode({ hasThread: false, hasSelection: false }), 'list');
	});
});
