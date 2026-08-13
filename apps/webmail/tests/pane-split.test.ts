import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { loadPaneSplit, savePaneSplit, PANE_SPLIT } from '../src/lib/components/ui/pane-split.ts';

describe('loadPaneSplit', () => {
	it('returns the fallback when storage is missing or invalid', () => {
		assert.deepEqual(loadPaneSplit('zaur:missing', [18, 82]), [18, 82]);
	});

	it('round-trips a valid size through localStorage', () => {
		const store: Record<string, string> = {};
		const prev = globalThis.localStorage;
		globalThis.localStorage = {
			getItem: (key: string) => store[key] ?? null,
			setItem: (key: string, value: string) => {
				store[key] = value;
			},
			removeItem: (key: string) => {
				delete store[key];
			},
			clear: () => {
				for (const key of Object.keys(store)) delete store[key];
			},
			key: (index: number) => Object.keys(store)[index] ?? null,
			get length() {
				return Object.keys(store).length;
			}
		} as Storage;

		try {
			savePaneSplit(PANE_SPLIT.mailList.key, [40, 60]);
			assert.deepEqual(loadPaneSplit(PANE_SPLIT.mailList.key, [36, 64]), [40, 60]);
			assert.deepEqual(loadPaneSplit(PANE_SPLIT.mailList.key, [36, 64]), [40, 60]);
		} finally {
			globalThis.localStorage = prev;
		}
	});

	it('ignores corrupt stored values', () => {
		const store: Record<string, string> = { 'zaur:bad': 'not-json' };
		const prev = globalThis.localStorage;
		globalThis.localStorage = {
			getItem: (key: string) => store[key] ?? null,
			setItem: () => {},
			removeItem: () => {},
			clear: () => {},
			key: () => null,
			length: 1
		} as Storage;

		try {
			assert.deepEqual(loadPaneSplit('zaur:bad', [18, 82]), [18, 82]);
		} finally {
			globalThis.localStorage = prev;
		}
	});
});
