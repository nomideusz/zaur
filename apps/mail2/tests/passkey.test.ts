import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { deviceName, fromBase64url, toBase64url } from '../src/lib/passkey.ts';
import { passkeyCeremonyHere } from '../src/lib/server/passkey-flow.ts';

afterEach(() => {
	delete process.env.STALWART_OAUTH_ISSUER_URL;
});

test('base64url both ways, without padding, for every byte', () => {
	const bytes = new Uint8Array(256).map((_, i) => i);
	const text = toBase64url(bytes);
	assert.match(text, /^[A-Za-z0-9_-]+$/);
	assert.deepEqual([...fromBase64url(text)], [...bytes]);
	assert.equal(toBase64url(new Uint8Array([0xfb, 0xff]).buffer), '-_8');
	assert.deepEqual([...fromBase64url('-_8')], [0xfb, 0xff]);
	// A view into a larger buffer encodes only its own bytes.
	assert.equal(toBase64url(new Uint8Array([1, 2, 3, 4]).subarray(1, 3)), toBase64url(new Uint8Array([2, 3])));
});

test('a new passkey is named after the browser and system', () => {
	assert.equal(
		deviceName('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36'),
		'Chrome on Linux'
	);
	assert.equal(
		deviceName('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'),
		'Safari on iOS'
	);
	assert.equal(deviceName('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0'), 'Firefox on Windows');
	assert.equal(deviceName(''), 'Passkey');
});

test('the ceremony runs on the page only on the mail server’s own origin', () => {
	assert.equal(passkeyCeremonyHere('https://mail.zaur.app'), false, 'no issuer configured');
	process.env.STALWART_OAUTH_ISSUER_URL = 'https://mail.zaur.app/';
	assert.equal(passkeyCeremonyHere('https://mail.zaur.app'), true);
	assert.equal(passkeyCeremonyHere('https://webmail.zaur.app'), false);
	assert.equal(passkeyCeremonyHere('http://mail.zaur.app'), false);
	assert.equal(passkeyCeremonyHere('http://localhost:5175'), false);
});
