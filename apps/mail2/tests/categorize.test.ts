import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import {
	categorizeInBackground,
	classify,
	classifierQuestions,
	classifierState,
	resetClassifierPause,
	type ClassifierEmail
} from '../src/lib/server/categorize.ts';

const realFetch = globalThis.fetch;
afterEach(() => {
	globalThis.fetch = realFetch;
	delete process.env.TYPESAFE_API_KEY;
	resetClassifierPause();
});

const email = (over: Partial<ClassifierEmail> = {}): ClassifierEmail => ({
	id: 'm1',
	keywords: {},
	from: [{ name: 'Acme Store', email: 'orders@acme.example' }],
	subject: 'Your order has shipped',
	preview: 'Preview text',
	textBody: [{ partId: '1', type: 'text/plain' }],
	bodyValues: { '1': { value: 'Tracking number 123\n' } },
	'header:List-Unsubscribe:asText': '<mailto:leave@acme.example>',
	'header:Precedence:asText': 'bulk',
	...over
});

/** A fetch that answers every call the same way and remembers the last request body. */
function fakeFetch(status: number, body: unknown) {
	const seen: { calls: number; last?: Record<string, unknown> } = { calls: 0 };
	globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
		seen.calls++;
		seen.last = JSON.parse(String(init?.body));
		return new Response(JSON.stringify(body), { status });
	}) as typeof fetch;
	return seen;
}

test('classifierState: named fields, bulk headers by name, plain-text body over preview', () => {
	const state = classifierState(email());
	assert.deepEqual(state.from, { name: 'Acme Store', email: 'orders@acme.example' });
	assert.equal(state.subject, 'Your order has shipped');
	assert.deepEqual(state.bulk_headers, { list_unsubscribe: '<mailto:leave@acme.example>', precedence: 'bulk' });
	assert.equal(state.body, 'Tracking number 123');
});

test('classifierState: an HTML-only message falls back to the preview, not markup', () => {
	const state = classifierState(
		email({ textBody: [{ partId: '2', type: 'text/html' }], bodyValues: { '2': { value: '<p>hi</p>' } } })
	);
	assert.equal(state.body, 'Preview text');
	// No bulk headers → the key is absent rather than an empty object the model has to read.
	assert.equal('bulk_headers' in classifierState(email({ 'header:List-Unsubscribe:asText': null, 'header:Precedence:asText': '' })), false);
});

test('classifierQuestions: one choice, every category with its contrast, plus other', () => {
	const { cat } = classifierQuestions();
	assert.equal(cat.type, 'choice');
	const criteria = cat.criteria as Record<string, { what: string; not_for?: string; examples: string[] }>;
	assert.deepEqual(Object.keys(criteria), ['receipts', 'transactions', 'newsletters', 'notifications', 'other']);
	for (const id of ['receipts', 'transactions', 'newsletters', 'notifications']) {
		assert.ok(criteria[id]!.what && criteria[id]!.not_for && criteria[id]!.examples.length > 0, id);
	}
	assert.ok(criteria.other!.what);
});

test('classify: sends jev-latest with structured state, honours the confidence floor', async () => {
	process.env.TYPESAFE_API_KEY = 'k';
	const seen = fakeFetch(200, { answers: { cat: { choice: 'receipts', confidence: 0.9 } } });
	assert.equal(await classify(email()), 'receipts');
	assert.equal(seen.last?.model, 'jev-latest');
	assert.deepEqual((seen.last?.state as { bulk_headers: unknown }).bulk_headers, {
		list_unsubscribe: '<mailto:leave@acme.example>',
		precedence: 'bulk'
	});

	fakeFetch(200, { answers: { cat: { choice: 'receipts', confidence: 0.3 } } });
	assert.equal(await classify(email()), 'other');

	fakeFetch(200, { answers: { cat: { choice: 'spam', confidence: 0.9 } } });
	await assert.rejects(classify(email()), /no answer/);
});

test('categorizeInBackground: a failed call pauses the next batch instead of re-firing it', async () => {
	process.env.TYPESAFE_API_KEY = 'k';
	const seen = fakeFetch(429, {});
	const client = {
		getAccountId: () => 'a',
		request: async () => ({ methodResponses: [['Email/get', { list: [email()] }, 'c']] }),
		patchKeywords: async () => {}
	} as never;
	assert.equal(categorizeInBackground(client, [{ id: 'm1', keywords: {} }]), 1);
	await new Promise((resolve) => setTimeout(resolve, 10));
	assert.equal(seen.calls, 1);
	// Same message, right after: paused, nothing queued, nothing sent.
	assert.equal(categorizeInBackground(client, [{ id: 'm1', keywords: {} }]), 0);
	assert.equal(seen.calls, 1);
});

test('categorizeInBackground: already categorised mail is skipped, Other only on recheck', async () => {
	process.env.TYPESAFE_API_KEY = 'k';
	const seen = fakeFetch(200, { answers: { cat: { choice: 'newsletters', confidence: 0.9 } } });
	const patched: unknown[] = [];
	const client = {
		getAccountId: () => 'a',
		request: async () => ({
			methodResponses: [['Email/get', { list: [email({ id: 'o1', keywords: { 'cat.other': true } })] }, 'c']]
		}),
		patchKeywords: async (patches: unknown) => void patched.push(patches)
	} as never;
	const done = { id: 'd1', keywords: { 'cat.receipts': true } };
	const other = { id: 'o1', keywords: { 'cat.other': true } };
	assert.equal(categorizeInBackground(client, [done, other]), 0);
	assert.equal(categorizeInBackground(client, [done, other], { recheck: true }), 1);
	await new Promise((resolve) => setTimeout(resolve, 10));
	assert.equal(seen.calls, 1);
	// The new keyword goes on and the old one comes off in the same patch.
	assert.deepEqual(patched, [{ o1: { 'cat.newsletters': true, 'cat.other': null } }]);
});
