import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveMailboxRouteByShortcut } from '../src/lib/mail/folder-shortcuts.ts';

describe('folder shortcuts', () => {
	it('resolves core folder shortcuts by role', () => {
		const mailboxes = [
			{ id: 'inbox', role: 'inbox' },
			{ id: 'sent', role: 'sent' },
			{ id: 'drafts', role: 'drafts' }
		];

		assert.equal(resolveMailboxRouteByShortcut(mailboxes, 'i'), 'inbox');
		assert.equal(resolveMailboxRouteByShortcut(mailboxes, 's'), 'sent');
		assert.equal(resolveMailboxRouteByShortcut(mailboxes, 'd'), 'drafts');
	});

	it('supports secondary folder shortcuts', () => {
		const mailboxes = [
			{ id: 'archive', role: 'archive' },
			{ id: 'trash', role: 'trash' },
			{ id: 'junk', role: 'junk' }
		];

		assert.equal(resolveMailboxRouteByShortcut(mailboxes, 'a'), 'archive');
		assert.equal(resolveMailboxRouteByShortcut(mailboxes, 't'), 'trash');
		assert.equal(resolveMailboxRouteByShortcut(mailboxes, 'j'), 'junk');
	});

	it('falls back to spam for junk shortcut', () => {
		const mailboxes = [{ id: 'spam', role: 'spam' }];
		assert.equal(resolveMailboxRouteByShortcut(mailboxes, 'j'), 'spam');
	});

	it('returns null for unknown or missing shortcuts', () => {
		const mailboxes = [{ id: 'inbox', role: 'inbox' }];
		assert.equal(resolveMailboxRouteByShortcut(mailboxes, 'x'), null);
		assert.equal(resolveMailboxRouteByShortcut(mailboxes, 'a'), null);
	});
});
