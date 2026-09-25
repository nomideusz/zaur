/**
 * Trix writes bare <blockquote>, <h1> and <pre>. Mail has no stylesheet to lean
 * on — most clients draw a quote as an indent with no rule, and a heading at 2em —
 * so their look goes inline on the way out, matching the editor.
 */
const QUOTE_STYLE = 'margin:0 0 0 .8ex;border-left:1px solid #ccc;padding-left:1ex';
const HEADING_STYLE = 'margin:.4em 0 .2em;font-size:1.25em;font-weight:600;line-height:1.3';
const CODE_STYLE =
	'margin:.4em 0;padding:.6em .8em;border-radius:6px;background:#f4f4f5;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.9em;white-space:pre-wrap';

export function outgoingHtml(html: string): string {
	return html
		.replaceAll('<blockquote>', `<blockquote style="${QUOTE_STYLE}">`)
		.replaceAll('<h1>', `<h1 style="${HEADING_STYLE}">`)
		.replaceAll('<pre>', `<pre style="${CODE_STYLE}">`);
}
