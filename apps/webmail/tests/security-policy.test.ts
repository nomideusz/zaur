import assert from 'node:assert/strict';
import test from 'node:test';
import { validateSameOriginJson } from '../src/lib/server/security-policy.ts';

function request(headers: Record<string, string>) {
	return { headers: new Headers(headers) };
}

test('accepts same-origin JSON mutations', () => {
	assert.equal(
		validateSameOriginJson(
			request({
				'content-type': 'application/json; charset=utf-8',
				origin: 'https://webmail.zaur.app',
				'sec-fetch-site': 'same-origin'
			}),
			'https://webmail.zaur.app'
		),
		null
	);
});

test('rejects cross-origin, missing-origin, and non-JSON mutations', () => {
	assert.equal(
		validateSameOriginJson(
			request({ 'content-type': 'application/json', origin: 'https://attacker.example' }),
			'https://webmail.zaur.app'
		),
		'origin'
	);
	assert.equal(
		validateSameOriginJson(request({ 'content-type': 'application/json' }), 'https://webmail.zaur.app'),
		'origin'
	);
	assert.equal(
		validateSameOriginJson(
			request({ 'content-type': 'text/plain', origin: 'https://webmail.zaur.app' }),
			'https://webmail.zaur.app'
		),
		'content_type'
	);
});
