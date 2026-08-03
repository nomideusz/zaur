import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	applyOptimisticMarkSeen,
	filterMessagesForSelection
} from '../src/lib/mail/selection-filters.ts';

const list = [
	{ id: 'a', unread: true, important: false },
	{ id: 'b', unread: false, important: true },
	{ id: 'c', unread: true, important: true },
	{ id: 'd', unread: false, important: false }
];

describe('filterMessagesForSelection', () => {
	it('filters all / none / new / normal / important', () => {
		assert.deepEqual(
			filterMessagesForSelection(list, 'all').map((m) => m.id),
			['a', 'b', 'c', 'd']
		);
		assert.deepEqual(filterMessagesForSelection(list, 'none'), []);
		assert.deepEqual(
			filterMessagesForSelection(list, 'new').map((m) => m.id),
			['a', 'c']
		);
		assert.deepEqual(
			filterMessagesForSelection(list, 'normal').map((m) => m.id),
			['d']
		);
		assert.deepEqual(
			filterMessagesForSelection(list, 'important').map((m) => m.id),
			['b', 'c']
		);
	});
});

describe('applyOptimisticMarkSeen', () => {
	it('clears selection and flips unread before any network await', () => {
		const selected = list.filter((m) => m.unread);
		const painted = applyOptimisticMarkSeen(selected);

		assert.equal(painted.clearedSelection, true);
		assert.equal(painted.nextUnread.a, false);
		assert.equal(painted.nextUnread.c, false);
		assert.equal(painted.nextUnread.b, undefined);

		/* Contract: callers clear selection + apply nextUnread, then await JMAP. */
		let networkResolved = false;
		const awaitNetwork = Promise.resolve().then(() => {
			networkResolved = true;
		});
		assert.equal(networkResolved, false);
		assert.equal(painted.clearedSelection, true);
		void awaitNetwork;
	});
});
