import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { movedPath } from '../src/lib/paths.ts';
import { hostRedirect, oidcIssuer, publicOrigin } from '../src/lib/server/hosts.ts';

const page = (url: string, method = 'GET') =>
	hostRedirect(new URL(url), new Request(url, { method, headers: { 'sec-fetch-mode': 'navigate' } }));

afterEach(() => {
	delete process.env.CANONICAL_ORIGIN;
	delete process.env.OIDC_ISSUER;
});

test('old paths: each reaches its new route, nothing else is touched', () => {
	assert.equal(movedPath('/login'), '/signin');
	assert.equal(movedPath('/login/passkey'), '/signin/passkey');
	assert.equal(movedPath('/api/auth/oauth/callback'), '/z/oauth/callback');
	assert.equal(movedPath('/api/events'), '/z/events');
	assert.equal(movedPath('/api/jmap/download'), '/z/jmap/download');
	assert.equal(movedPath('/api/internal/handoff'), '/z/internal/handoff');
	assert.equal(movedPath('/auth/claim'), '/z/claim');
	assert.equal(movedPath('/auth/return'), '/z/return');
	for (const path of ['/', '/signin', '/api/auth', '/api/account', '/auth/device', '/login/x', '/settings']) {
		assert.equal(movedPath(path), undefined, path);
	}
});

test('hosts: unset, every host serves everything', () => {
	assert.equal(page('https://webmail.zaur.app/settings'), null);
	assert.equal(page('https://mail.zaur.app/oidc/authorize?x=1'), null);
	assert.equal(oidcIssuer(new URL('https://mail.zaur.app/oidc/token')), 'https://mail.zaur.app');
	assert.equal(publicOrigin(new URL('https://webmail.zaur.app/z/internal/handoff')), 'https://webmail.zaur.app');
});

test('hosts: pages move to the canonical host, under their new paths', () => {
	process.env.CANONICAL_ORIGIN = 'https://mail.zaur.app/';
	process.env.OIDC_ISSUER = 'https://webmail.zaur.app';
	assert.equal(page('https://webmail.zaur.app/?thread=T1'), 'https://mail.zaur.app/?thread=T1');
	assert.equal(page('https://webmail.zaur.app/login?next=%2Fsettings'), 'https://mail.zaur.app/signin?next=%2Fsettings');
	assert.equal(page('https://webmail.zaur.app/auth/claim?token=t'), 'https://mail.zaur.app/z/claim?token=t');
	assert.equal(page('https://mail.zaur.app/settings'), null);
	assert.equal(publicOrigin(new URL('https://webmail.zaur.app/z/internal/handoff')), 'https://mail.zaur.app');
	// Not a page load: a fetch or EventSource from a tab still open there, a POST.
	const events = 'https://webmail.zaur.app/api/events';
	assert.equal(hostRedirect(new URL(events), new Request(events, { headers: { accept: 'text/event-stream' } })), null);
	assert.equal(page('https://webmail.zaur.app/z/internal/handoff', 'POST'), null);
	const shell = new Request('https://webmail.zaur.app/', {
		headers: { 'sec-fetch-mode': 'navigate', 'user-agent': 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A; wv) AppleWebKit/537.36' }
	});
	assert.equal(hostRedirect(new URL(shell.url), shell), null);
});

test('hosts: /oidc and discovery stay on (or go to) the issuer', () => {
	process.env.CANONICAL_ORIGIN = 'https://mail.zaur.app';
	process.env.OIDC_ISSUER = 'https://webmail.zaur.app';
	assert.equal(page('https://webmail.zaur.app/oidc/authorize?client_id=music'), null);
	assert.equal(page('https://webmail.zaur.app/.well-known/openid-configuration'), null);
	assert.equal(page('https://mail.zaur.app/oidc/authorize?client_id=music'), 'https://webmail.zaur.app/oidc/authorize?client_id=music');
	assert.equal(oidcIssuer(new URL('https://mail.zaur.app/oidc/token')), 'https://webmail.zaur.app');
	// The token endpoint is a server-to-server POST: answered wherever it lands.
	assert.equal(page('https://mail.zaur.app/oidc/token', 'POST'), null);
});
