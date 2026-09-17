import { test } from 'node:test';
import assert from 'node:assert/strict';

import { isAllowedPushEndpoint, pushSubscriptionId } from '../src/lib/server/push.ts';
import { incomingMailMessage } from '../src/lib/server/push-watcher.ts';

test('isAllowedPushEndpoint: real push services only, since the server POSTs to it', () => {
	for (const endpoint of [
		'https://fcm.googleapis.com/fcm/send/abc',
		'https://jmt17.google.com/fcm/send/abc',
		'https://updates.push.services.mozilla.com/wpush/v2/abc',
		'https://web.push.apple.com/QGd',
		'https://wns2-by3p.notify.windows.com/w/?token=abc'
	]) {
		assert.equal(isAllowedPushEndpoint(endpoint), true, endpoint);
	}
	for (const endpoint of [
		'http://fcm.googleapis.com/fcm/send/abc', // not https
		'https://fcm.googleapis.com:8443/fcm/send/abc', // odd port
		'https://evilfcm.googleapis.com.attacker.dev/x', // suffix is not the host
		'https://jmt17.google.com/other', // sharded FCM host, wrong path
		'https://mail:8080/jmap', // the internal network
		'https://169.254.169.254/latest/meta-data',
		'not a url'
	]) {
		assert.equal(isAllowedPushEndpoint(endpoint), false, endpoint);
	}
});

test('pushSubscriptionId: one row per browser endpoint', () => {
	const a = pushSubscriptionId('https://fcm.googleapis.com/fcm/send/a');
	assert.equal(a, pushSubscriptionId('https://fcm.googleapis.com/fcm/send/a'));
	assert.notEqual(a, pushSubscriptionId('https://fcm.googleapis.com/fcm/send/b'));
	assert.match(a, /^[0-9a-f]{32}$/);
});

test('incomingMailMessage: one message links to its thread; several link to the inbox', () => {
	const one = incomingMailMessage(
		[{ from: [{ name: 'Ada', email: 'ada@example.com' }], subject: ' Hello ', threadId: 't/1' }],
		{ key: 'nom@zaur.app', label: 'Nom', showAccount: false, unreadCount: 3 }
	);
	assert.deepEqual(one, {
		title: 'New mail',
		body: 'Ada: Hello',
		url: '/?thread=t%2F1',
		tag: 'zaur-new-mail-nom@zaur.app',
		unreadCount: 3
	});

	const many = incomingMailMessage(
		[{ from: [], subject: '', threadId: 'a' }, { from: undefined, subject: undefined, threadId: 'b' }] as never,
		{ key: 'nom@zaur.app', label: 'Nom', showAccount: false }
	);
	assert.equal(many.body, '2 new messages in Inbox');
	assert.equal(many.url, '/');
});

test('incomingMailMessage: with several accounts, says which and switches to it on click', () => {
	const message = incomingMailMessage(
		[{ from: [{ email: 'bob@example.com' }], subject: '', threadId: 't1' }] as never,
		{ key: 'work@zaur.app', label: 'Work', showAccount: true }
	);
	assert.equal(message.title, 'Work');
	assert.equal(message.body, 'bob@example.com: (no subject)');
	assert.equal(message.url, '/?thread=t1&account=work%40zaur.app');
});
