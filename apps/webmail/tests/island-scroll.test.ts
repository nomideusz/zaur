import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { nextIslandCollapsed } from '../src/lib/shell/island-scroll-math.ts';

describe('island-scroll hysteresis', () => {
	it('expands near the top of a scroller', () => {
		assert.deepEqual(
			nextIslandCollapsed({ collapsed: true, scrollTop: 10, delta: 5, accumulated: 20 }),
			{ collapsed: false, accumulated: 0 }
		);
	});

	it('collapses after sustained downward scroll', () => {
		let state = { collapsed: false, accumulated: 0 };
		state = nextIslandCollapsed({ ...state, scrollTop: 100, delta: 20 });
		assert.equal(state.collapsed, false);
		state = nextIslandCollapsed({ ...state, scrollTop: 140, delta: 20 });
		assert.equal(state.collapsed, true);
		assert.equal(state.accumulated, 0);
	});

	it('expands after sustained upward scroll', () => {
		let state = { collapsed: true, accumulated: 0 };
		state = nextIslandCollapsed({ ...state, scrollTop: 200, delta: -10 });
		assert.equal(state.collapsed, true);
		state = nextIslandCollapsed({ ...state, scrollTop: 180, delta: -10 });
		assert.equal(state.collapsed, false);
	});

	it('resets accumulation when scroll direction flips', () => {
		const mid = nextIslandCollapsed({
			collapsed: false,
			scrollTop: 120,
			delta: 10,
			accumulated: 20
		});
		assert.equal(mid.collapsed, false);
		assert.equal(mid.accumulated, 30);
		const flipped = nextIslandCollapsed({
			collapsed: false,
			scrollTop: 110,
			delta: -5,
			accumulated: mid.accumulated
		});
		assert.equal(flipped.accumulated, -5);
	});
});
