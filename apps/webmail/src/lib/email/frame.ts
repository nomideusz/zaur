import { browser } from '$app/environment';

/**
 * Builds the self-contained `srcdoc` document for rendering an HTML email body inside a
 * sandboxed iframe. The iframe is a CSS + script isolation boundary on top of the DOMPurify
 * sanitization in `html.ts` (defense in depth — the iframe runs no scripts at all).
 *
 * Because nothing in the app's stylesheet cascades into the frame, the reader typography that
 * normally comes from `.z-email-body` in `reader.css` is re-injected here, and the theme tokens
 * it references are resolved from the live document at build time (so dark / circadian themes
 * carry through).
 */

/** Theme tokens the frame stylesheet references — resolved from the app root at build time. */
const COLOR_TOKENS = [
	'--z-fg',
	'--z-fg-muted',
	'--z-fg-subtle',
	'--z-accent',
	'--z-accent-hover',
	'--z-border',
	'--z-border-strong',
	'--z-surface-sunken',
	'--z-chrome'
] as const;

/** Light-theme defaults — used only for SSR, where there is no live root to probe. */
const SSR_TOKEN_FALLBACK: Record<string, string> = {
	'--z-fg': '#1a1d1f',
	'--z-fg-muted': '#6b6b69',
	'--z-fg-subtle': '#9b9a97',
	'--z-accent': '#3b6abf',
	'--z-accent-hover': '#2f59ad',
	'--z-border': '#e8e8e6',
	'--z-border-strong': '#d5d5d2',
	'--z-surface-sunken': '#f5f4f1',
	'--z-chrome': '#ffffff',
	'--z-reader-text': '1rem',
	'--z-reader-leading': '1.7',
	'--z-reader-font':
		"-apple-system, BlinkMacSystemFont, 'avenir next', avenir, 'segoe ui', 'helvetica neue', 'Adwaita Sans', Cantarell, Ubuntu, roboto, noto, helvetica, arial, sans-serif",
	'--z-space-reader-body-stack': '1em'
};

/**
 * Resolve token values from the live app root. Custom properties that themselves contain
 * `var()` (colors, font) are not resolved by `getComputedStyle` directly, so we read them back
 * through real properties on a throwaway probe element.
 */
function resolveTokens(): Record<string, string> {
	if (!browser) return SSR_TOKEN_FALLBACK;

	const root = document.documentElement;
	const rootStyle = getComputedStyle(root);

	// The probe inherits the live --z-* custom properties from the app root, so reading them back
	// through a real `color` resolves the full var() chain to an rgb. (Re-declaring each token as
	// `var(--token)` on the probe self-references it — that's invalid at computed-value time and
	// silently collapses every token to the inherited text colour, i.e. white in dark mode.)
	const probe = document.createElement('div');
	probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none';
	probe.style.color = `var(${COLOR_TOKENS[0]})`;
	probe.style.fontFamily = 'var(--z-reader-font)';
	root.appendChild(probe);
	const probeStyle = getComputedStyle(probe);

	const colorOf = (token: string) => {
		probe.style.color = `var(${token})`;
		return getComputedStyle(probe).color;
	};

	const tokens: Record<string, string> = {};
	for (const token of COLOR_TOKENS) tokens[token] = colorOf(token);
	tokens['--z-reader-font'] = probeStyle.fontFamily || SSR_TOKEN_FALLBACK['--z-reader-font'];

	// Plain length/number tokens have no nested var() — read them straight off the root.
	tokens['--z-reader-text'] =
		rootStyle.getPropertyValue('--z-reader-text').trim() || SSR_TOKEN_FALLBACK['--z-reader-text'];
	tokens['--z-reader-leading'] =
		rootStyle.getPropertyValue('--z-reader-leading').trim() ||
		SSR_TOKEN_FALLBACK['--z-reader-leading'];
	tokens['--z-space-reader-body-stack'] =
		rootStyle.getPropertyValue('--z-space-reader-body-stack').trim() ||
		SSR_TOKEN_FALLBACK['--z-space-reader-body-stack'];

	root.removeChild(probe);
	return tokens;
}

/**
 * The frame stylesheet. Mirrors the `.z-email-body` rules from `reader.css`, translated to raw
 * CSS (no Tailwind `@apply`) since utilities don't exist inside the frame. Theme-dependent
 * colors come through the resolved `--z-*` tokens, so the light/dark split only needs to encode
 * the hard-coded light-card treatments that the reader applies in dark mode.
 */
const FRAME_CSS = `
*, *::before, *::after { box-sizing: border-box; }
/* Paint the document with the reader's own surface colour rather than leaving it transparent: a
   transparent srcdoc iframe falls back to the UA's *white* canvas, which leaves theme-foreground
   text invisible in dark mode once an email's own backgrounds are stripped (clean reading view).
   The light reading card (.z-email-body--light) overrides this with its white surface. */
html, body { background: var(--z-chrome); }
/* Horizontal scroll for fixed-width mail that can't reflow to a phone's width; the parent owns
   the height, so vertical stays hidden (the iframe never shows its own vertical scrollbar). */
html { -webkit-text-size-adjust: 100%; overflow-x: auto; overflow-y: hidden; }
:root.dark { color-scheme: dark; }
body {
	margin: 0;
	color: var(--z-fg);
	font-family: var(--z-reader-font);
	font-size: var(--z-reader-text);
	line-height: var(--z-reader-leading);
	overflow-wrap: anywhere;
}
.z-email-body :where(p + p, p + ul, p + ol, ul + p, ol + p) { margin-top: var(--z-space-reader-body-stack); }
.z-email-body :where(a) {
	color: var(--z-accent);
	text-decoration: underline;
	text-underline-offset: 2px;
}
.z-email-body :where(a):hover { color: var(--z-accent-hover); }
.z-email-body :where(img) { max-width: 100%; height: auto; }
.z-email-body :where(table) { max-width: 100%; }
.z-email-body :where(blockquote) {
	margin-top: 1rem;
	margin-bottom: 0;
	padding: 0 0 0 1rem;
	border: 0;
	border-left: 2px solid color-mix(in srgb, var(--z-border) 55%, transparent);
	border-radius: 0;
	background: transparent;
	color: var(--z-fg-muted);
}
.z-email-body :where(blockquote blockquote) {
	margin-top: 0.75rem;
	padding-left: 0.75rem;
	border-left-width: 1px;
	border-left-color: color-mix(in srgb, var(--z-border) 35%, transparent);
	color: var(--z-fg-subtle);
}
.z-email-body :where(blockquote blockquote blockquote) {
	border-left-color: color-mix(in srgb, var(--z-border) 22%, transparent);
}
.z-email-body :where(pre, code) {
	font-family: var(--z-reader-font);
	border-radius: 0.125rem;
	background-color: color-mix(in srgb, var(--z-surface-sunken) 80%, transparent);
	font-size: 0.9em;
}
.z-email-body :where(pre) { overflow-x: auto; padding: 0.75rem; }
.z-email-body :where(hr) { margin-block: 1rem; border-color: var(--z-border); }
.z-email-quote { font-size: 0.875rem; line-height: 1.625; white-space: pre-wrap; }

/* Dark mode — hard-coded light cards for light-authored mail (see reader.css). Other dark
   colors are already carried by the resolved tokens. */
:root.dark .z-email-body--html [data-z-light-surface] {
	color-scheme: light;
	color: #1a1a1a;
	border-radius: 0.25rem;
	isolation: isolate;
}
:root.dark .z-email-body--html [data-z-light-surface] :where(a) { color: var(--z-accent); }
:root.dark .z-email-body--html [data-z-light-surface] :where(blockquote) {
	color: #4a4a4a;
	border-left-color: color-mix(in srgb, #1a1a1a 18%, transparent);
}
:root.dark .z-email-body--light {
	color-scheme: light;
	background-color: #ffffff;
	color: #1a1a1a;
	border-radius: 0.5rem;
	padding: clamp(0.75rem, 3vw, 1.25rem);
	isolation: isolate;
	filter: brightness(0.86);
}
:root.dark .z-email-body--light :where(a) { color: #1d4ed8; }
:root.dark .z-email-body--light :where(blockquote) {
	color: #4a4a4a;
	border-left-color: color-mix(in srgb, #1a1a1a 18%, transparent);
}
:root.dark .z-email-body--light :where(pre, code) {
	background-color: color-mix(in srgb, #1a1a1a 6%, transparent);
	color: #1a1a1a;
}
:root.dark .z-email-body--light :where(hr) { border-color: color-mix(in srgb, #1a1a1a 12%, transparent); }

/* Reflow fixed-width layout tables when the frame itself is narrow (phones). The frame width
   tracks the reading column, so this keys off content width rather than device width — wide
   content that genuinely cannot shrink scrolls within the frame via overflow-x. */
@media (max-width: 600px) {
	.z-email-body--html :where(table, td, th, tr, div, p, span, ul, ol, blockquote) {
		max-width: 100% !important;
		min-width: 0 !important;
	}
	.z-email-body--html :where(img) { max-width: 100% !important; height: auto !important; }
	/* Sanitizer-tagged fixed-width wrappers (html.ts) — drop the specified width so it
	   stops inflating table min-content width, which max-width alone can't override. */
	.z-email-body--html :where([data-z-fixed-width]) { width: 100% !important; }
}
`;

/** Last-line defense after DOMPurify — keeps `<script>` out of srcdoc so the sandbox never logs blocks. */
function stripExecutableTags(html: string): string {
	return html
		.replace(/<script\b[\s\S]*?<\/script>/gi, '')
		.replace(/<script\b[^>]*\/>/gi, '');
}

export function buildEmailFrameSrcdoc(options: {
	html: string;
	darkMode: boolean;
	lightSurface: boolean;
}): string {
	const tokens = resolveTokens();
	const tokenVars = Object.entries(tokens)
		.map(([name, value]) => `${name}: ${value};`)
		.join(' ');

	const bodyClass = `z-email-body z-email-body--html${
		options.lightSurface ? ' z-email-body--light' : ''
	}`;

	return (
		`<!doctype html><html${options.darkMode ? ' class="dark"' : ''}>` +
		`<head><meta charset="utf-8">` +
		`<meta name="viewport" content="width=device-width, initial-scale=1">` +
		// No referrer on image loads: avoids leaking the reader's client to senders and
		// sidesteps hosts that 403 hotlinked images by Referer (e.g. nexo.systems).
		`<meta name="referrer" content="no-referrer">` +
		`<base target="_blank">` +
		`<style>:root { ${tokenVars} }${FRAME_CSS}</style></head>` +
		`<body class="${bodyClass}">${stripExecutableTags(options.html)}</body></html>`
	);
}
