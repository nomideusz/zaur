import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keyboardFrame } from '../src/lib/keyboard.ts';

test('keyboard: a layout that already shrank reports nothing', () => {
	// Chrome with interactive-widget=resizes-content: innerHeight follows the keyboard.
	assert.equal(keyboardFrame(520, 520, 0), null);
	assert.equal(keyboardFrame(800, 800, 0), null);
});

test('keyboard: a toolbar-sized change is not a keyboard', () => {
	assert.equal(keyboardFrame(800, 740, 0), null);
});

test('keyboard: iOS overlay lifts the shell to the visible strip', () => {
	assert.deepEqual(keyboardFrame(844, 500, 0), { height: 500, top: 0 });
});

test('keyboard: a pan is kept, so the header is not translated twice', () => {
	assert.deepEqual(keyboardFrame(844, 480, 140), { height: 480, top: 140 });
});
