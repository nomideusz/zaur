import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { shareNotifyBody, shareNotifySubject } from '../src/lib/files/share-notify.ts';

describe('shareNotify', () => {
	it('names the item, sharer, and Files link', () => {
		assert.equal(shareNotifySubject('Notes.md', 'Ada'), 'Ada shared “Notes.md” with you');
		const body = shareNotifyBody({
			itemName: 'Notes.md',
			itemKind: 'file',
			sharerName: 'Ada',
			role: 'read',
			filesUrl: 'https://webmail.zaur.app/files'
		});
		assert.match(body, /Ada shared the file “Notes.md” with you \(view access\)/);
		assert.match(body, /https:\/\/webmail\.zaur\.app\/files/);
	});

	it('describes write access on folders', () => {
		const body = shareNotifyBody({
			itemName: 'Contracts',
			itemKind: 'folder',
			sharerName: 'Ada',
			role: 'write',
			filesUrl: 'https://webmail.zaur.app/files'
		});
		assert.match(body, /folder “Contracts”/);
		assert.match(body, /edit access/);
	});
});
