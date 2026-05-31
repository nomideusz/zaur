import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	mailboxDisplayName,
	mailboxRouteId,
	moveTargetMailboxes,
	resolveMailboxKind
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
		assert.equal(mailboxDisplayName('important'), 'Important');
		assert.equal(mailboxDisplayName('custom', 'Work'), 'Work');
	});

	it('uses stable route ids for known kinds', () => {
		assert.equal(mailboxRouteId('mb-1', 'inbox'), 'inbox');
		assert.equal(mailboxRouteId('mb-2', 'important'), 'important');
		assert.equal(mailboxRouteId('mb-3', 'custom'), 'mb-3');
	});

	it('excludes archive and important from move targets', () => {
		const mailboxes = [
			{ id: 'inbox', jmapId: '1', name: 'Emails', role: 'inbox', unread: 0, total: 0 },
			{ id: 'important', jmapId: '2', name: 'Important', role: 'important', unread: 0, total: 0 },
			{ id: 'archive', jmapId: '3', name: 'Archive', role: 'archive', unread: 0, total: 0 },
			{ id: 'sent', jmapId: '4', name: 'Sent', role: 'sent', unread: 0, total: 0 }
		];

		const targets = moveTargetMailboxes(mailboxes, mailboxes[0]);
		assert.deepEqual(
			targets.map((mb) => mb.id),
			['sent']
		);
	});
});
