/**
 * Trix writes bare <blockquote>, which most clients draw as an indent with no
 * rule. Mail has no stylesheet to lean on, so the rule goes inline on the way out.
 */
const QUOTE_STYLE = 'margin:0 0 0 .8ex;border-left:1px solid #ccc;padding-left:1ex';

export function outgoingHtml(html: string): string {
	return html.replaceAll('<blockquote>', `<blockquote style="${QUOTE_STYLE}">`);
}
