import { test } from 'node:test';
import assert from 'node:assert/strict';
import { codeNotLoaded, messageOf } from '../src/lib/errors.ts';

test('a server error says what the server said', () => {
	assert.equal(messageOf({ status: 400, body: { message: 'That address is taken' } }, 'Could not save'), 'That address is taken');
	// The app's own 502 has a sentence of its own; only a proxy's stock text is replaced.
	assert.equal(
		messageOf({ status: 502, body: { message: 'The server did not accept these rules. Nothing was saved.' } }, 'Could not save the rules'),
		'The server did not accept these rules. Nothing was saved.'
	);
	assert.equal(messageOf(new Error('Quota exceeded'), 'Could not save'), 'Quota exceeded');
});

test('text that tells a person nothing gives way to the caller’s', () => {
	assert.equal(messageOf({ status: 500, body: { message: 'Internal Error' } }, 'Could not save'), 'Could not save');
	assert.equal(messageOf({ status: 500, body: { message: 'Internal Server Error' } }, 'Could not save'), 'Could not save');
	assert.equal(messageOf({ status: 500, body: {} }, 'Could not save'), 'Could not save');
	assert.equal(messageOf('nope', 'Could not save'), 'Could not save');
	assert.equal(messageOf(undefined, 'Could not save'), 'Could not save');
});

test('a request that got no answer never shows the browser’s words', () => {
	// Chromium, WebKit, Firefox — with no connection.
	for (const words of ['Failed to fetch', 'Load failed', 'NetworkError when attempting to fetch resource.']) {
		assert.equal(messageOf(new TypeError(words), 'The contact could not be saved.', false), "You're offline — the contact could not be saved.");
	}
	// Connected, and still no answer: the server is what is away.
	assert.equal(messageOf(new TypeError('Failed to fetch'), 'Action failed', true), "Can't reach the server — action failed");
	assert.equal(messageOf({ status: 502, body: { message: 'Bad Gateway' } }, 'Could not save the rules', true), "Can't reach the server — could not save the rules");
	assert.equal(messageOf({ status: 504, body: { message: 'Gateway Timeout' } }, 'Could not save', true), "Can't reach the server — could not save");
	// A bug is not a dead connection.
	assert.equal(messageOf(new TypeError('x is not a function'), 'Could not save', false), 'x is not a function');
});

test('code that could not be fetched is told apart from a bug', () => {
	// Chromium, WebKit, Firefox, and Vite's stylesheet preload.
	for (const words of [
		'Failed to fetch dynamically imported module: https://webmail.zaur.app/_app/immutable/nodes/5.abc.js',
		'Importing a module script failed.',
		'error loading dynamically imported module: https://webmail.zaur.app/_app/immutable/nodes/5.abc.js',
		'Unable to preload CSS for /_app/immutable/assets/5.abc.css'
	]) {
		assert.equal(codeNotLoaded(new TypeError(words)), true, words);
	}
	assert.equal(codeNotLoaded(new TypeError('x is not a function')), false);
	assert.equal(codeNotLoaded(new TypeError('Failed to fetch')), false);
	assert.equal(codeNotLoaded(undefined), false);
});
