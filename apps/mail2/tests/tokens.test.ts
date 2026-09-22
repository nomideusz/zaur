import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/routes/styles/tokens.css', import.meta.url), 'utf8');

// Design system v2 ("Pastel channels, tactile controls") is contractual: one
// light palette with a specified dark ramp, one accent, six channels, fixed
// geometry. These tests guard against accidental edits that would silently
// change the look.
test('tokens: the v2 surfaces and ink ramp are present', () => {
	assert.match(css, /--z-ground: #eef1f5/); // behind the app column
	assert.match(css, /--z-canvas: #f6f7f9/); // pane ground
	assert.match(css, /--z-surface: #ffffff/); // cards, panels
	assert.match(css, /--z-ink: #0b1220/); // headings, unread
	assert.match(css, /--z-body: #1e293b/); // reader copy
	assert.match(css, /--z-soft: #64748b/); // the lightest text may be
	assert.match(css, /--z-faint: #94a3b8/); // rules and glyphs only
	assert.match(css, /--z-line: #cbd5e1/);
	assert.match(css, /--z-hairline: #e2e8f0/);
});

test('tokens: selection is the correspondence solid, everywhere', () => {
	assert.match(css, /--z-accent: #2563eb/);
	assert.match(css, /--z-accent-fg: #ffffff/);
	assert.match(css, /--z-accent-soft: #dbeafe/);
	assert.match(css, /--z-accent-edge: #1d4ed8/);
});

test('tokens: six channels, each with fill, stroke, solid and ink', () => {
	for (const channel of ['correspondence', 'confirmed', 'needs', 'flagged', 'digest', 'discard']) {
		for (const part of ['fill', 'stroke', 'solid', 'ink']) {
			assert.match(css, new RegExp(`--z-ch-${channel}-${part}: #[0-9a-f]{6}`), `${channel}.${part}`);
		}
	}
	assert.match(css, /--z-ch-correspondence-solid: #2563eb/);
	assert.match(css, /--z-ch-discard-stroke: #ef4444/);
});

test('tokens: the dark ramp is written down, behind an explicit theme attribute', () => {
	assert.match(css, /:root\[data-theme='dark'\] \{[^}]*--z-ground: #070b10/);
	assert.match(css, /:root\[data-theme='dark'\] \{[^}]*--z-ink: #e8eef6/);
});

test('tokens: geometry (list width, measure, drawer) is pinned', () => {
	assert.match(css, /--z-list-width: 480px/);
	assert.match(css, /--z-measure: 33em/);
	assert.match(css, /--z-sidebar-width: 240px/);
	assert.match(css, /--z-drawer-width: 280px/);
});

test('tokens: system faces only, no web fonts', () => {
	assert.match(css, /--font-sans: Seravek, /);
	assert.match(css, /--font-mono: ui-monospace, /);
	assert.doesNotMatch(css, /@font-face/);
});

test('tokens: the mark has no inks of its own — it wears the functional one', () => {
	// Rose leading into teal on a white tile read as Gmail. The mark is a button
	// among buttons now (ZaurMark.svelte), drawn in --z-strong like its neighbours.
	assert.doesNotMatch(css, /--z-mark-/);
});

test('tokens: four elevations, no more', () => {
	assert.match(css, /--z-shadow-tactile:/);
	assert.match(css, /--z-shadow-raised:/);
	assert.match(css, /--z-shadow-menu:/);
	assert.match(css, /--z-shadow-panel:/);
});

test('tokens: Tailwind theme bridge exposes the palette as utilities', () => {
	assert.match(css, /@theme inline/);
	assert.match(css, /--color-accent: var\(--z-accent\)/);
	assert.match(css, /--color-canvas: var\(--z-canvas\)/);
	assert.match(css, /--color-ink: var\(--z-ink\)/);
	assert.match(css, /--radius-control: 8px/);
});

// --- shared primitives -----------------------------------------------------

const base = readFileSync(new URL('../src/routes/styles/base.css', import.meta.url), 'utf8');

test('base: the primitives every surface draws from exist once', () => {
	for (const cls of [
		'.btn-tactile',
		'.btn-primary',
		'.btn-danger',
		'.z-icon-btn',
		'.z-group',
		'.z-segment',
		'.z-check',
		'.hobday-checkbox',
		'.z-field',
		'.z-kbd',
		'.z-avatar',
		'.z-chip',
		'.z-count',
		'.z-railed',
		'.z-hue-wash',
		'.z-card',
		'.z-card-head',
		'.z-card-body',
		'.z-card-foot',
		'.z-menu',
		'.z-caption'
	]) {
		const definitions = base.split(`\n\t${cls} {`).length - 1;
		assert.equal(definitions, 1, `${cls} defined exactly once`);
	}
});

test('base: captions are soft sentence case, never faint or caps', () => {
	for (const cls of ['.z-caption {', '.z-menu-caption {']) {
		const caption = base.slice(base.indexOf(cls), base.indexOf('}', base.indexOf(cls)));
		assert.match(caption, /color: var\(--z-soft\)/, cls);
		assert.doesNotMatch(caption, /uppercase/, cls);
	}
});

// --- shell layout ---------------------------------------------------------

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
