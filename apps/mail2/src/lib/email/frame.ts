/**
 * Builds the self-contained `srcdoc` document for rendering an email body inside a
 * sandboxed iframe. The iframe is a CSS + script isolation boundary on top of the
 * DOMPurify sanitization in `html.ts` (defense in depth — the frame runs no scripts).
 *
 * Mail 2.0 is light-only by decision (ADR-0005), so the reader typography from the
 * design handoff is baked in rather than resolved from theme tokens: 16px/1.75 in
 * `#2b3433`, accent links, and a `#ececec` left border on quoted replies.
 */

const FRAME_STYLES = `
	:root { color-scheme: light; }
	html { overflow-x: auto; }
	body {
		margin: 0;
		font-family: 'Libre Franklin', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
			'Helvetica Neue', Arial, sans-serif;
		font-size: 16px;
		line-height: 1.75;
		color: #2b3433;
		overflow-wrap: anywhere;
	}
	p { margin: 0; }
	p + p, p + ul, p + ol, ul + p, ol + p, p + pre, pre + p { margin-top: 1em; }
	.z-email-body--plain p + p { margin-top: 0; }
	a { color: #7a3b5e; text-decoration: underline; text-underline-offset: 2px; }
	img { max-width: 100%; height: auto; }
	table { max-width: 100%; }
	/* Fixed-width marketing wrappers (tagged by the sanitizer) reflow to the column. */
	[data-z-fixed-width] { width: 100% !important; max-width: 100% !important; }
	blockquote {
		margin: 1rem 0 0;
		padding: 0 0 0 1rem;
		border: 0;
		border-left: 2px solid #ececec;
		border-radius: 0;
		background: transparent;
		color: #5d6766;
	}
	blockquote blockquote {
		margin-top: 0.75rem;
		padding-left: 0.75rem;
		border-left-width: 1px;
		border-left-color: #f1f1f1;
		color: #767676;
	}
	.z-email-quote { white-space: pre-wrap; }
	.z-email-quote:not(blockquote) {
		display: block;
		margin-top: 1rem;
		padding: 0 0 0 1rem;
		border-left: 2px solid #ececec;
		color: #5d6766;
	}
	pre, code {
		font-family: 'Noto Sans Mono', ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, monospace;
		font-size: 0.9em;
	}
	pre { background: #fafafa; border: 1px solid #ececec; border-radius: 6px; padding: 12px; overflow-x: auto; }
	code { background: #fafafa; border-radius: 4px; padding: 1px 4px; }
	hr { border: 0; border-top: 1px solid #ececec; margin: 1rem 0; }
`;

export function buildEmailFrameSrcdoc(options: { html: string; plain: boolean }): string {
	const bodyClass = options.plain ? 'z-email-body z-email-body--plain' : 'z-email-body';
	return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>${FRAME_STYLES}</style>
</head>
<body class="${bodyClass}">${options.html}</body>
</html>`;
}
