import { test } from 'node:test';
import assert from 'node:assert/strict';
import { legacyRedirect } from '../src/lib/legacy-links.ts';

const go = (path: string, register?: string) => legacyRedirect(new URL(path, 'https://webmail.zaur.app'), register);

test('legacy links: 1.0 mail URLs land in the inbox, threads open', () => {
	assert.equal(go('/mail'), '/');
	assert.equal(go('/mail/inbox/'), '/');
	assert.equal(go('/mail/Sent'), '/?folder=Sent');
	assert.equal(go('/mail/search?q=invoice'), '/');
	assert.equal(go('/mail/inbox/T1a?account=b%40zaur.app'), '/?thread=T1a&account=b%40zaur.app');
	assert.equal(go('/mail/archive/T2'), '/?folder=archive&thread=T2');
	assert.equal(go('/mail/compose?to=a%40b.c&mode=reply'), '/?to=a%40b.c');
	assert.equal(go('/mail/compose'), '/?to=');
});

test('legacy links: settings, search pages and /register', () => {
	assert.equal(go('/settings/contacts'), '/contacts');
	assert.equal(go('/settings/writing'), '/settings/reading');
	assert.equal(go('/settings/general'), '/settings');
	assert.equal(go('/settings/display'), '/settings/appearance');
	// mail2's own pages, some of which share 1.0's names, stay put.
	for (const own of ['/settings/security', '/settings/reading', '/settings/appearance', '/settings/addresses', '/settings/folders', '/settings/app-passwords']) {
		assert.equal(go(own), null, own);
	}
	assert.equal(go('/calendar/search'), '/calendar');
	assert.equal(go('/files/search?q=x'), '/files');
	assert.equal(go('/register?invite=abc', 'https://register.zaur.app'), 'https://register.zaur.app/?invite=abc');
	assert.equal(go('/register'), '/login');
});

test('legacy links: mail2 URLs pass through', () => {
	for (const path of ['/', '/?thread=T1', '/settings', '/contacts', '/calendar', '/meet/zaur-abc', '/login', '/mailbox']) {
		assert.equal(go(path), null, path);
	}
});
