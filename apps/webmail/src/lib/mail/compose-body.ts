const QUOTE_MARKER = /\n\n---\n[\s\S]*$/;

function splitBodyAndQuote(body: string): { beforeQuote: string; quote: string } {
	const match = body.match(QUOTE_MARKER);
	if (!match || match.index === undefined) {
		return { beforeQuote: body, quote: '' };
	}
	return {
		beforeQuote: body.slice(0, match.index),
		quote: match[0]
	};
}

/** Ensure outgoing body includes the configured signature (message + quote preserved). */
export function ensureBodyIncludesSignature(
	body: string,
	options: { useSignature: boolean; signature: string }
): string {
	if (!options.useSignature) return body;

	const sig = options.signature.trim();
	if (!sig) return body;

	const { beforeQuote, quote } = splitBodyAndQuote(body);
	const trimmed = beforeQuote.trimEnd();

	if (!trimmed) {
		return `\n\n${sig}${quote}`;
	}

	if (trimmed === sig || trimmed.endsWith(`\n\n${sig}`) || trimmed.endsWith(sig)) {
		return body;
	}

	return `${trimmed}\n\n${sig}${quote}`;
}

/** True when the body is empty or contains only the configured signature. */
export function isComposeBodyEmpty(
	body: string,
	options: { useSignature: boolean; signature: string }
): boolean {
	const trimmed = body.trim();
	if (!trimmed) return true;

	if (!options.useSignature) return false;

	const sig = options.signature.trim();
	if (!sig) return false;

	return trimmed === sig;
}
