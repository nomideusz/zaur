import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	inboxImportantSectionCanShowMore,
	inboxNormalSectionDefaultVisible
} from '../src/lib/mail/inbox-list-sections.ts';

describe('inboxNormalSectionDefaultVisible', () => {
	it('shows a full page when nothing needs triage', () => {
		assert.equal(inboxNormalSectionDefaultVisible(0, 0), 8);
	});

	it('shrinks as New and Important grow', () => {
		assert.equal(inboxNormalSectionDefaultVisible(4, 0), 6);
		assert.equal(inboxNormalSectionDefaultVisible(0, 8), 4);
		assert.equal(inboxNormalSectionDefaultVisible(6, 6), 2);
	});

	it('collapses to zero when triage fills the view', () => {
		assert.equal(inboxNormalSectionDefaultVisible(16, 0), 0);
		assert.equal(inboxNormalSectionDefaultVisible(8, 8), 0);
	});
});

describe('inboxImportantSectionCanShowMore', () => {
	it('hides when all displayable rows fit within the visible limit', () => {
		assert.equal(inboxImportantSectionCanShowMore(6, 8, 6, 8, true), false);
	});

	it('hides when mailbox total exceeds rows but nothing displayable is hidden', () => {
		assert.equal(inboxImportantSectionCanShowMore(6, 8, 10, 8, true), false);
	});

	it('shows when more loaded rows exist than currently visible', () => {
		assert.equal(inboxImportantSectionCanShowMore(10, 8, 10, 8, false), true);
	});

	it('shows when a full fetch page is visible and the server has more', () => {
		assert.equal(inboxImportantSectionCanShowMore(8, 8, 8, 8, true), true);
	});

	it('hides when every loaded row is visible and the server is exhausted', () => {
		assert.equal(inboxImportantSectionCanShowMore(6, 8, 6, 8, false), false);
	});
});
