import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	mailboxDisplayName,
	mailboxRouteId,
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
});
