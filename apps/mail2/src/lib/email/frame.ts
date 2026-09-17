/**
 * Builds the self-contained `srcdoc` document for rendering an email body inside a
 * sandboxed iframe. The iframe is a CSS + script isolation boundary on top of the
 * DOMPurify sanitization in `html.ts` (defense in depth — the frame runs no scripts).
 *
 * A frame cannot read the shell's tokens, so the reader typography is baked in
 * from design system v2 (14px / 1.65 body ink, mono for code, the accent for
 * links) in two palettes. Plain-text mail is ours to typeset and follows the
 * theme. HTML mail was authored for a light page: in dark it keeps the light
 * palette and the frame sits on a white card, because recolouring someone
 * else's layout is how you get invisible text.
 */

const LIGHT = {
	ink: '#1e293b',
	quote: '#475569',
	deepQuote: '#64748b',
	link: '#2563eb',
	linkHover: '#1d4ed8',
	rule: '#e2e8f0',
	deepRule: '#f1f5f9',
	well: '#f8fafc'
};

const DARK = {
	ink: '#c3cedb',
	quote: '#a3b1c2',
	deepQuote: '#8fa0b3',
	link: '#93c5fd',
	linkHover: '#bfdbfe',
	rule: '#2c3949',
	deepRule: '#1e2836',
	well: '#11171f'
};

function frameStyles(palette: typeof LIGHT, scheme: 'light' | 'dark'): string {
	return `
	:root { color-scheme: ${scheme}; }
	html { overflow-x: auto; }
	body {
		margin: 0;
		font-family: Seravek, 'Gill Sans Nova', Ubuntu, Calibri, 'DejaVu Sans', source-sans-pro, sans-serif;
		font-size: 14px;
		line-height: 1.65;
		color: ${palette.ink};
		overflow-wrap: anywhere;
	}
	p { margin: 0; }
	p + p, p + ul, p + ol, ul + p, ol + p, p + pre, pre + p { margin-top: 0.9em; }
	.z-email-body--plain p + p { margin-top: 0; }
	a { color: ${palette.link}; text-decoration: underline; text-underline-offset: 2px; }
	a:hover { color: ${palette.linkHover}; }
	img { max-width: 100%; height: auto; }
	table { max-width: 100%; }
	/* Fixed-width marketing wrappers (tagged by the sanitizer) reflow to the column. */
	[data-z-fixed-width] { width: 100% !important; max-width: 100% !important; }
	blockquote {
		margin: 1rem 0 0;
		padding: 0 0 0 1rem;
		border: 0;
		border-left: 2px solid ${palette.rule};
		border-radius: 0;
		background: transparent;
		color: ${palette.quote};
	}
	blockquote blockquote {
		margin-top: 0.75rem;
		padding-left: 0.75rem;
		border-left-width: 1px;
		border-left-color: ${palette.deepRule};
		color: ${palette.deepQuote};
	}
	.z-email-quote { white-space: pre-wrap; }
	.z-email-quote:not(blockquote) {
		display: block;
		margin-top: 1rem;
		padding: 0 0 0 1rem;
		border-left: 2px solid ${palette.rule};
		color: ${palette.quote};
	}
	pre, code {
		font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace;
		font-size: 0.9em;
	}
	pre { background: ${palette.well}; border: 1px solid ${palette.rule}; border-radius: 6px; padding: 12px; overflow-x: auto; }
	code { background: ${palette.well}; border-radius: 4px; padding: 1px 4px; }
	hr { border: 0; border-top: 1px solid ${palette.rule}; margin: 1rem 0; }
`;
}

const LIGHT_STYLES = frameStyles(LIGHT, 'light');
const DARK_STYLES = frameStyles(DARK, 'dark');

export function buildEmailFrameSrcdoc(options: {
	html: string;
	plain: boolean;
	/** The shell is dark. Only plain-text mail follows it; see the module note. */
	dark?: boolean;
}): string {
	const bodyClass = options.plain ? 'z-email-body z-email-body--plain' : 'z-email-body';
	const styles = options.dark && options.plain ? DARK_STYLES : LIGHT_STYLES;
	return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>${styles}</style>
</head>
<body class="${bodyClass}">${options.html}</body>
</html>`;
}
