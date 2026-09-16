import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/routes/styles/tokens.css', import.meta.url), 'utf8');

// The resolved prototype variants (design handoff, September 2026) are contractual:
// one light palette, one accent, fixed geometry. These tests guard against accidental
// edits that would silently change the redesign's look.
test('tokens: resolved prototype variants are present', () => {
	assert.match(css, /--z-accent: #7a3b5e/); // plum accent
	assert.match(css, /--z-accent-fg: #ffffff/);
	assert.match(css, /--z-canvas: #f4f4f4/); // shell ground
	assert.match(css, /--z-container: #ffffff/); // cards, panels
	assert.match(css, /--z-ink: #101413/); // primary text
	assert.match(css, /--z-ink-body: #2b3433/); // reader copy
});

test('tokens: prototype geometry (list width, measure) is pinned', () => {
	assert.match(css, /--z-list-width: 520px/);
	assert.match(css, /--z-measure: 33em/);
});

test('tokens: Libre Franklin is the interface face', () => {
	assert.match(css, /--font-sans: 'Libre Franklin'/);
});

test('tokens: Noto Sans Mono is the code face', () => {
	assert.match(css, /--font-mono: 'Noto Sans Mono'/);
});

test('tokens: Tailwind theme bridge exposes the palette as utilities', () => {
	assert.match(css, /@theme inline/);
	assert.match(css, /--color-accent: var\(--z-accent\)/);
	assert.match(css, /--color-canvas: var\(--z-canvas\)/);
	assert.match(css, /--color-container: var\(--z-container\)/);
	assert.match(css, /--color-ink: var\(--z-ink\)/);
});

// --- shell layout ---------------------------------------------------------

const base = readFileSync(new URL('../src/routes/styles/base.css', import.meta.url), 'utf8');
const shell = base.slice(base.indexOf('.z-shell'));

// The phone shell is a single pane: the page hands whichever of the list and the
// reader is not on screen a `max-md:hidden`, and a stray extra column would put
// them side by side at 190px each. The sidebar only rejoins the grid at 1024,
// below which it is an overlay drawer — a column there would squeeze the reader
// to nothing on a tablet.
test('shell: the grid collapses to one pane, then two, then three', () => {
	assert.match(shell, /\.z-shell \{[^}]*grid-template-columns: minmax\(0, 1fr\);/);
	assert.match(shell, /@media \(min-width: 768px\) \{\s*\.z-shell \{\s*grid-template-columns: var\(--z-list-w[^)]*\) 1px minmax\(0, 1fr\);/);
	assert.match(
		shell,
		/@media \(min-width: 1024px\) \{\s*\.z-shell\[data-sidebar='open'\] \{\s*grid-template-columns: var\(--z-sidebar-width\)/
	);
});
