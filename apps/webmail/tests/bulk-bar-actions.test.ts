import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { bulkBarActions } from '../src/lib/components/mail/bulk-bar-actions.ts';

describe('bulkBarActions', () => {
	it('shows read/unread opposites when the selection is mixed', () => {
		const actions = bulkBarActions({
			counts: { new: 2, important: 1, normal: 3, notImportant: 5 },
			selectedCount: 6,
			canMarkImportant: true,
			deleteLabel: 'Trash'
		});

		assert.deepEqual(
			actions.map((action) => action.id),
			['unsee', 'mark-seen', 'important', 'not-important', 'trash', 'cancel']
		);
		assert.equal(actions[0]?.label, 'Unsee (4)');
		assert.equal(actions[1]?.label, 'Mark seen (2)');
		assert.equal(actions[2]?.label, 'Highlight (5)');
		assert.equal(actions[3]?.label, 'Not highlighted (1)');
	});

	it('omits actions that would not affect the current selection', () => {
		const actions = bulkBarActions({
			counts: { new: 3, important: 0, normal: 0, notImportant: 3 },
			selectedCount: 3,
			canMarkImportant: true,
			deleteLabel: 'Trash'
		});

		assert.deepEqual(
			actions.map((action) => action.id),
			['mark-seen', 'important', 'trash', 'cancel']
		);
	});

	it('offers Mark spam ahead of delete when eligible', () => {
		const actions = bulkBarActions({
			counts: { new: 1, important: 0, normal: 0, notImportant: 1 },
			selectedCount: 1,
			canMarkImportant: true,
			canMarkSpam: true,
			deleteLabel: 'Trash'
		});

		assert.deepEqual(
			actions.map((action) => action.id),
			['mark-seen', 'important', 'spam', 'trash', 'cancel']
		);
		assert.equal(actions[2]?.label, 'Mark spam');
	});

	it('offers Not spam in Junk instead of Mark spam', () => {
		const actions = bulkBarActions({
			counts: { new: 1, important: 0, normal: 0, notImportant: 1 },
			selectedCount: 1,
			canMarkImportant: false,
			canRestore: true,
			restoreLabel: 'Not spam',
			deleteLabel: 'Trash'
		});

		assert.deepEqual(
			actions.map((action) => action.id),
			['mark-seen', 'restore', 'trash', 'cancel']
		);
		assert.equal(actions[1]?.label, 'Not spam');
	});

	it('offers Move to inbox in Archive and Trash', () => {
		const actions = bulkBarActions({
			counts: { new: 0, important: 0, normal: 2, notImportant: 2 },
			selectedCount: 2,
			canMarkImportant: false,
			canRestore: true,
			restoreLabel: 'Move to inbox',
			deleteLabel: 'Delete forever'
		});

		assert.equal(actions.find((action) => action.id === 'restore')?.label, 'Move to inbox');
		assert.ok(!actions.some((action) => action.id === 'spam'));
	});

	it('skips important actions in trash', () => {
		const actions = bulkBarActions({
			counts: { new: 0, important: 2, normal: 1, notImportant: 1 },
			selectedCount: 3,
			canMarkImportant: false,
			deleteLabel: 'Delete forever'
		});

		assert.deepEqual(
			actions.map((action) => action.id),
			['unsee', 'trash', 'cancel']
		);
		assert.equal(actions[0]?.label, 'Unsee');
		assert.equal(actions[1]?.label, 'Delete forever');
	});
});
