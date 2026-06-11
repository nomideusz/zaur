import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	canMarkImportantFromMailboxRole,
	isExcludedFromImportantSection,
	isPrimarySidebarMailbox,
	mailboxDisplayName,
	mailboxRouteId,
	moveTargetMailboxes,
	primarySidebarMailboxRank,
	resolveMailboxKind,
	shouldClearImportantOnMoveTo,
	shouldPresentImportantColors,
	shouldShowImportantRainbow
} from '../src/lib/mail/mailboxes.ts';

describe('mailboxes', () => {
	it('resolves standard JMAP roles', () => {
		assert.equal(resolveMailboxKind({ name: 'Inbox', role: 'inbox' }), 'inbox');
		assert.equal(resolveMailboxKind({ name: 'Spam', role: 'junk' }), 'junk');
		assert.equal(resolveMailboxKind({ name: 'Trash', role: 'trash' }), 'trash');
	});

	it('resolves Starwart display names and legacy aliases', () => {
		assert.equal(resolveMailboxKind({ name: 'E-mails', role: 'inbox' }), 'inbox');
		assert.equal(resolveMailboxKind({ name: 'Junk', role: 'junk' }), 'junk');
		assert.equal(resolveMailboxKind({ name: 'Bin', role: 'trash' }), 'trash');
		assert.equal(resolveMailboxKind({ name: 'Starred', role: null }), 'important');
		assert.equal(resolveMailboxKind({ name: 'Notes', role: null }), 'memos');
		assert.equal(resolveMailboxKind({ name: 'Zaured', role: null }), 'important');
	});

	it('maps kinds to display names', () => {
		assert.equal(mailboxDisplayName('inbox'), 'Emails');
		assert.equal(mailboxDisplayName('junk'), 'Spam');
		assert.equal(mailboxDisplayName('trash'), 'Trash');
		assert.equal(mailboxDisplayName('important'), 'Highlights');
		assert.equal(mailboxDisplayName('custom', 'Work'), 'Work');
	});

	it('uses stable route ids for known kinds', () => {
		assert.equal(mailboxRouteId('mb-1', 'inbox'), 'inbox');
		assert.equal(mailboxRouteId('mb-2', 'important'), 'important');
		assert.equal(mailboxRouteId('mb-3', 'custom'), 'mb-3');
	});

	it('excludes inbox, archive, important, and unimplemented folders from move targets', () => {
		const mailboxes = [
			{ id: 'inbox', jmapId: '1', name: 'Emails', role: 'inbox' as const, unread: 0, total: 0 },
			{ id: 'important', jmapId: '2', name: 'Important', role: 'important' as const, unread: 0, total: 0 },
			{ id: 'archive', jmapId: '3', name: 'Archive', role: 'archive' as const, unread: 0, total: 0 },
			{ id: 'scheduled', jmapId: '5', name: 'Scheduled', role: 'scheduled' as const, unread: 0, total: 0 },
			{ id: 'snoozed', jmapId: '6', name: 'Snoozed', role: 'snoozed' as const, unread: 0, total: 0 },
			{ id: 'memos', jmapId: '7', name: 'Memos', role: 'memos' as const, unread: 0, total: 0 },
			{ id: 'sent', jmapId: '4', name: 'Sent', role: 'sent' as const, unread: 0, total: 0 },
			{ id: 'junk', jmapId: '8', name: 'Spam', role: 'junk' as const, unread: 0, total: 0 },
			{ id: 'trash', jmapId: '9', name: 'Trash', role: 'trash' as const, unread: 0, total: 0 }
		];

		const targets = moveTargetMailboxes(mailboxes, mailboxes[0]);
		assert.deepEqual(
			targets.map((mb) => mb.id),
			[]
		);
	});

	it('blocks marking important in trash, spam, and drafts', () => {
		assert.equal(canMarkImportantFromMailboxRole('inbox'), true);
		assert.equal(canMarkImportantFromMailboxRole('archive'), true);
		assert.equal(canMarkImportantFromMailboxRole('sent'), true);
		assert.equal(canMarkImportantFromMailboxRole('trash'), false);
		assert.equal(canMarkImportantFromMailboxRole('junk'), false);
		assert.equal(canMarkImportantFromMailboxRole('drafts'), false);
	});

	it('clears important when moving to trash or spam', () => {
		assert.equal(shouldClearImportantOnMoveTo('trash'), true);
		assert.equal(shouldClearImportantOnMoveTo('junk'), true);
		assert.equal(shouldClearImportantOnMoveTo('archive'), false);
		assert.equal(shouldClearImportantOnMoveTo('inbox'), false);
	});

	it('orders primary sidebar mailboxes with Important under Inbox', () => {
		assert.equal(primarySidebarMailboxRank('inbox'), 0);
		assert.equal(primarySidebarMailboxRank('important'), 1);
		assert.equal(primarySidebarMailboxRank('drafts'), 2);
		assert.equal(isPrimarySidebarMailbox('important'), true);
		assert.equal(isPrimarySidebarMailbox('scheduled'), false);
	});

	it('excludes trash and spam from important section surfacing', () => {
		assert.equal(isExcludedFromImportantSection('trash'), true);
		assert.equal(isExcludedFromImportantSection('junk'), true);
		assert.equal(isExcludedFromImportantSection('archive'), false);
		assert.equal(shouldShowImportantRainbow('trash'), false);
		assert.equal(shouldShowImportantRainbow('inbox'), true);
	});

	it('respects the colorful Important subjects preference', () => {
		assert.equal(shouldPresentImportantColors('inbox', true), true);
		assert.equal(shouldPresentImportantColors('inbox', false), false);
		assert.equal(shouldPresentImportantColors('trash', true), false);
	});
});
