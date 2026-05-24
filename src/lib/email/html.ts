import DOMPurify from 'dompurify';

const EMAIL_SANITIZE_CONFIG = {
	ADD_ATTR: ['target', 'rel', 'style', 'class', 'width', 'height', 'align', 'valign', 'bgcolor', 'color'],
	ALLOW_DATA_ATTR: false,
	FORCE_BODY: true,
	FORBID_TAGS: [
		'script',
		'iframe',
		'object',
		'embed',
		'form',
		'input',
		'button',
		'meta',
		'link',
		'base',
		'svg',
		'math',
		'style'
	],
	FORBID_ATTR: [
		'onerror',
		'onload',
		'onclick',
		'onmouseover',
		'onfocus',
		'onblur',
		'onchange',
		'onsubmit',
		'onkeydown',
		'onkeyup',
		'onmousedown',
		'onmouseup'
	]
};

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function isExternalUrl(url: string): boolean {
	return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//');
}

export function plainTextToSafeHtml(text: string): string {
	const quoteIndex = text.search(/\n\n---\n(?:On .+ wrote:|Forwarded message:)/);
	if (quoteIndex >= 0) {
		const main = text.slice(0, quoteIndex);
		const quote = text.slice(quoteIndex).trim();
		return `${formatPlainSegment(main)}<blockquote class="z-email-quote">${formatPlainSegment(quote, true)}</blockquote>`;
	}

	return formatPlainSegment(text);
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

export function prepareEmailHtml(
	rawHtml: string,
	options: { allowExternal: boolean }
): { html: string; blockedExternal: boolean } {
	let blockedExternal = false;

	DOMPurify.addHook('afterSanitizeAttributes', (node) => {
		if (!options.allowExternal) {
			if (node.tagName === 'IMG') {
				const src = node.getAttribute('src');
				if (src && isExternalUrl(src)) {
					node.setAttribute('data-blocked-src', src);
					node.removeAttribute('src');
					node.setAttribute('alt', '[Image blocked]');
					blockedExternal = true;
				}
			}
			if (node.hasAttribute('style')) {
				const style = node.getAttribute('style');
				if (style && /url\s*\(/i.test(style)) {
					node.setAttribute('style', style.replace(/url\s*\([^)]*\)/gi, 'none'));
					blockedExternal = true;
				}
			}
		}

		if (node.tagName === 'A') {
			node.setAttribute('target', '_blank');
			node.setAttribute('rel', 'noopener noreferrer');
		}
	});

	const html = DOMPurify.sanitize(rawHtml, EMAIL_SANITIZE_CONFIG);
	DOMPurify.removeHook('afterSanitizeAttributes');

	return { html, blockedExternal };
}

export function renderMessageBody(options: {
	bodyHtml?: string;
	bodyText: string;
	allowExternal: boolean;
}): { html: string; blockedExternal: boolean; isHtml: boolean } {
	if (options.bodyHtml?.trim()) {
		const prepared = prepareEmailHtml(options.bodyHtml, { allowExternal: options.allowExternal });
		return { ...prepared, isHtml: true };
	}

	return {
		html: plainTextToSafeHtml(options.bodyText),
		blockedExternal: false,
		isHtml: false
	};
}
