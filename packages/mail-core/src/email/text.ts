// Plain-text email helpers: quote detection, excerpting, and safe HTML
// rendering of text bodies. Pure string logic — no DOM — shared between
// webmail (`email/html.ts` re-exports these) and the native app.

export function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

const PLAIN_QUOTE_PATTERNS = [
	/\n\n---\n(?:On .+ wrote:|Forwarded message:)/,
	/\n-{5,}\s*original message\s*-{5,}/i,
	/\nOn .+ wrote:\n/,
	/(?:^|\n)-{5,}\s*original message\s*-{5,}/i
];

export function normalizeEmailPlainText(text: string): string {
	return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

export function findQuoteStart(text: string, patterns: RegExp[]): number {
	let earliest = -1;
	for (const pattern of patterns) {
		const index = text.search(pattern);
		if (index >= 0 && (earliest < 0 || index < earliest)) {
			earliest = index;
		}
	}
	return earliest;
}

export function findPlainTextQuoteStart(text: string): number {
	return findQuoteStart(normalizeEmailPlainText(text), PLAIN_QUOTE_PATTERNS);
}

export function plainTextExcerpt(text: string, maxLen = 120): string {
	const trimmed = normalizeEmailPlainText(text).trim();
	if (!trimmed) return '';
	const quoteAt = findPlainTextQuoteStart(trimmed);
	const main = quoteAt >= 0 ? trimmed.slice(0, quoteAt).trim() : trimmed;
	return main.slice(0, maxLen);
}

export function plainTextToSafeHtml(text: string): string {
	const normalized = normalizeEmailPlainText(text);
	const quoteIndex = findPlainTextQuoteStart(normalized);
	if (quoteIndex >= 0) {
		const main = normalized.slice(0, quoteIndex);
		const quote = normalized.slice(quoteIndex).trim();
		return `${formatPlainSegment(main)}<blockquote class="z-email-quote">${formatPlainSegment(quote, true)}</blockquote>`;
	}

	return formatPlainSegment(normalized);
}

function formatPlainSegment(text: string, skipLinkify = false): string {
	const lines = text.split('\n');
	const parts: string[] = [];
	let quoteLines: string[] = [];

	function linkify(text: string): string {
		return escapeHtml(text)
			.replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;')
			.replace(
				/(https?:\/\/[^\s<]+)/g,
				'<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
			);
	}

	function flushQuote() {
		if (!quoteLines.length) return;
		parts.push(
			`<blockquote class="z-email-quote">${quoteLines.map((line) => linkify(line.replace(/^>\s?/, ''))).join('<br>')}</blockquote>`
		);
		quoteLines = [];
	}

	for (const line of lines) {
		if (/^>\s?/.test(line)) {
			quoteLines.push(line);
			continue;
		}
		flushQuote();
		parts.push(skipLinkify ? escapeHtml(line) : linkify(line));
	}

	flushQuote();
	return parts.join('<br>');
}
