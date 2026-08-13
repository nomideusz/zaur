import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { spliceSelection } from '../src/lib/utils/keyboard.ts';

describe('spliceSelection', () => {
	it('inserts at the caret', () => {
		assert.deepEqual(spliceSelection('ab', 1, 1, '\t'), { value: 'a\tb', caret: 2 });
	});

	it('replaces a selection', () => {
		assert.deepEqual(spliceSelection('hello', 1, 4, '\t'), { value: 'h\to', caret: 2 });
	});

	it('clamps out-of-range offsets', () => {
		assert.deepEqual(spliceSelection('hi', 9, 12, '\t'), { value: 'hi\t', caret: 3 });
	});
});
