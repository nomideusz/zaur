import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildEmailFrameSrcdoc } from '../src/lib/email/frame.ts';

const CSP = /<meta http-equiv="Content-Security-Policy" content="([^"]*)">/;

test('email frame: offline until remote images are asked for', () => {
	for (const plain of [false, true]) {
		const blocked = buildEmailFrameSrcdoc({ html: '<p>hi</p>', plain });
		const policy = CSP.exec(blocked)?.[1] ?? '';
		assert.match(policy, /default-src 'none'/);
		assert.match(policy, /img-src data: blob:(;|$)/);
		// No remote source anywhere in it: no scheme, no host, no wildcard.
		assert.doesNotMatch(policy, /https?:|\*/);
		// A policy only governs what is parsed after it, so it leads the mail's markup.
		assert.ok(blocked.indexOf('Content-Security-Policy') < blocked.indexOf('<body'));
	}
	// Not asked for is not allowed: only an explicit yes lifts it, and only for images.
	const policy = (remote?: boolean) => CSP.exec(buildEmailFrameSrcdoc({ html: '', plain: false, remote }))?.[1];
	assert.equal(policy(false), policy());
	assert.equal(policy(true), "default-src 'none'; img-src data: blob: https:; style-src 'unsafe-inline'");
});

test('email frame: a mail never loads from the app itself, asked or not', () => {
	const origin = 'https://webmail.zaur.app';
	for (const remote of [false, true]) {
		const policy = CSP.exec(buildEmailFrameSrcdoc({ html: '', plain: false, remote, origin }))?.[1] ?? '';
		// 'self' is every address of the app, /oidc/logout among them.
		assert.doesNotMatch(policy, /'self'/);
		assert.match(policy, /default-src 'none'/);
		// The app appears once, as the exact path that serves inline (cid:) images.
		assert.deepEqual(policy.match(/https:\/\/webmail\.zaur\.app[^\s;]*/g), [`${origin}/api/jmap/download`]);
		assert.doesNotMatch(policy, /media-src|font-src|connect-src|frame-src/);
	}
});

test('email frame: a long line of code wraps instead of widening the mail', () => {
	const css = buildEmailFrameSrcdoc({ html: '', plain: false });
	assert.match(css, /pre \{[^}]*white-space: pre-wrap;[^}]*overflow-wrap: anywhere;/);
});
