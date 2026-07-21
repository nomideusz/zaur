import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	bulkBarActions,
	estimateBulkActionWidth,
	fitBulkActions
} from '../src/lib/components/mail/bulk-bar-actions.ts';

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

describe('fitBulkActions', () => {
	const marks = [
		{ id: 'unsee', label: 'Unsee (4)', variant: 'link', priority: 2 },
		{ id: 'mark-seen', label: 'Mark seen (2)', variant: 'link', priority: 2 },
		{ id: 'important', label: 'Highlight (5)', variant: 'link', priority: 1 },
		{ id: 'spam', label: 'Mark spam', variant: 'link', priority: 3 }
	] as const;

	it('keeps Highlight inline even with no space', () => {
		const { inline, overflow } = fitBulkActions([...marks], 0);
		assert.deepEqual(
			inline.map((action) => action.id),
			['important']
		);
		assert.deepEqual(
			overflow.map((action) => action.id),
			['unsee', 'mark-seen', 'spam']
		);
	});

	it('moves everything inline when space is unbounded', () => {
		const { inline, overflow } = fitBulkActions([...marks], Number.POSITIVE_INFINITY);
		assert.equal(inline.length, marks.length);
		assert.equal(overflow.length, 0);
	});

	it('fills inline slots by priority but preserves display order', () => {
		// Room for highlight + roughly one more action beyond the reserve.
		const width = 150 + estimateBulkActionWidth(marks[2]) + estimateBulkActionWidth(marks[0]) + 1;
		const { inline, overflow } = fitBulkActions([...marks], width);
		assert.deepEqual(
			inline.map((action) => action.id),
			['unsee', 'important']
		);
		assert.deepEqual(
			overflow.map((action) => action.id),
			['mark-seen', 'spam']
		);
	});

	it('inlines a lone overflow action instead of a one-item More menu', () => {
		// Room for all but the last action — the leftover takes the More trigger's slot.
		const width =
			150 +
			estimateBulkActionWidth(marks[2]) +
			estimateBulkActionWidth(marks[0]) +
			estimateBulkActionWidth(marks[1]) +
			1;
		const { inline, overflow } = fitBulkActions([...marks], width);
		assert.equal(overflow.length, 0);
		assert.equal(inline.length, marks.length);
	});
});
