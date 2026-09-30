import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keyboardFrame, layoutShrank } from '../src/lib/keyboard.ts';

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

test('keyboard: Chrome shrinks the layout instead, which counts only while typing', () => {
	assert.equal(layoutShrank(839, 539, true), true);
	// A short window, or the toolbar sliding away, is not a keyboard.
	assert.equal(layoutShrank(839, 539, false), false);
	assert.equal(layoutShrank(839, 783, true), false);
});
