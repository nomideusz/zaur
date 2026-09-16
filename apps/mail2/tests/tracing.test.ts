import { test } from 'node:test';
import assert from 'node:assert/strict';

import { shapeSpans } from '../src/lib/server/tracing.ts';

const span = (name: string, attributes: Record<string, unknown>, traceId = 't1') =>
	({ name, attributes, spanContext: () => ({ traceId }) }) as never;

test('shapeSpans: the root is the endpoint, with status, route and no query string', () => {
	const shape = shapeSpans();
	const resolve = span('sveltekit.resolve', { 'http.route': 'unknown', 'http.response.status_code': 200 });
	const redirect = span('sveltekit.load', { 'http.route': '/(app)', 'sveltekit.load.result.location': '/login?next=%2Fsettings' });
	const root = span('sveltekit.handle.root', {
		'http.route': 'unknown',
		'http.method': 'GET',
		'http.url': 'https://mail2.zaur.app/_app/remote/qulo93/search?payload=secret-terms'
	});
	shape.onEnd(resolve);
	shape.onEnd(redirect);
	shape.onEnd(root);

	assert.deepEqual((root as any).attributes, {
		'http.route': '/_app/remote/qulo93/search',
		'http.method': 'GET',
		'http.url': 'https://mail2.zaur.app/_app/remote/qulo93/search',
		'url.path': '/_app/remote/qulo93/search',
		'http.response.status_code': 200
	});
	// Children keep their own attributes, minus anything Traceway reads as an endpoint.
	assert.deepEqual((resolve as any).attributes, {});
	assert.deepEqual((redirect as any).attributes, { 'sveltekit.load.result.location': '/login' });
});

test('shapeSpans: an unmatched route drops http.route so a 404 folds into UNMATCHED', () => {
	const shape = shapeSpans();
	const root = span(
		'sveltekit.handle.root',
		{ 'http.route': 'unknown', 'http.method': 'GET', 'http.url': 'https://mail2.zaur.app/wp-login.php?x=1' },
		't2'
	);
	shape.onEnd(root);
	assert.equal((root as any).attributes['http.route'], undefined);
	assert.equal((root as any).attributes['url.path'], '/wp-login.php');
	assert.equal((root as any).attributes['http.response.status_code'], undefined);
});
