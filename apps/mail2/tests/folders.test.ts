import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mailboxOfUrl, stillIn } from '../src/lib/mail/folders.ts';

test('stillIn: a destroy from Trash only takes what is still in Trash', () => {
	const emails: { id: string; mailboxIds?: Record<string, boolean> }[] = [
		{ id: 'a', mailboxIds: { trash: true } },
		// Undo put this one back in the inbox; the Trash list still showed its row.
		{ id: 'b', mailboxIds: { inbox: true } },
		{ id: 'c', mailboxIds: { trash: true, work: true } },
		{ id: 'd' }
	];
	assert.deepEqual(stillIn(emails, 'trash'), ['a', 'c']);
	assert.deepEqual(stillIn([], 'trash'), []);
});

test('mailboxOfUrl: the address says which folder is shown', () => {
	const own = [
		{ id: 'in', kind: 'inbox' },
		{ id: 'arch', kind: 'archive' }
	];
	const shared = [{ id: 'team', mailboxes: [{ id: 'tin', kind: 'inbox' }, { id: 'tsent', kind: 'sent' }] }];
	const at = (search: string) => mailboxOfUrl(new URLSearchParams(search), own, shared);
	assert.deepEqual(at(''), { id: 'in', account: null });
	assert.deepEqual(at('?folder=arch&thread=t1'), { id: 'arch', account: null });
	// A folder that was deleted, or another mailbox's: the inbox.
	assert.deepEqual(at('?folder=tsent'), { id: 'in', account: null });
	assert.deepEqual(at('?shared=team&folder=tsent'), { id: 'tsent', account: 'team' });
	assert.deepEqual(at('?shared=team'), { id: 'tin', account: 'team' });
	// Nothing to show yet: the share is gone, or the folders have not loaded.
	assert.equal(at('?shared=gone&folder=arch'), null);
	assert.equal(mailboxOfUrl(new URLSearchParams('?folder=arch'), undefined, shared), null);
});
