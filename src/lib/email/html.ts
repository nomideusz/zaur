import DOMPurify from 'dompurify';
import { browser } from '$app/environment';

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

function isLightColor(value: string): boolean {
	const normalized = value.trim().toLowerCase();
	if (!normalized || normalized === 'transparent') return false;
	if (normalized === '#fff' || normalized === '#ffffff' || normalized === 'white') return true;
	const rgb = normalized.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
	if (rgb) {
		const [, r, g, b] = rgb.map(Number);
		return r > 240 && g > 240 && b > 240;
	}
	return false;
}

function isDarkColor(value: string): boolean {
	const normalized = value.trim().toLowerCase();
	if (!normalized) return false;
	if (normalized === '#000' || normalized === '#000000' || normalized === 'black') return true;
	const rgb = normalized.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
	if (rgb) {
		const [, r, g, b] = rgb.map(Number);
		return r < 60 && g < 60 && b < 60;
	}
	return false;
}

function stripLightBackground(node: Element) {
	const bgcolor = node.getAttribute('bgcolor');
	if (bgcolor && isLightColor(bgcolor)) {
		node.removeAttribute('bgcolor');
	}

	if (!node.hasAttribute('style')) return;

	const style = node.getAttribute('style') ?? '';
	const cleaned = style
		.split(';')
		.filter((rule) => {
			const trimmed = rule.trim();
			if (!trimmed) return false;
			const match = trimmed.match(/^(background(?:-color)?)\s*:\s*(.+)$/i);
			if (!match) return true;
			return !isLightColor(match[2]);
		})
		.join(';')
		.trim();

	if (cleaned) node.setAttribute('style', cleaned);
	else node.removeAttribute('style');
}

function stripDarkTextColor(node: Element) {
	const color = node.getAttribute('color');
	if (color && isDarkColor(color)) {
		node.removeAttribute('color');
	}

	if (!node.hasAttribute('style')) return;

	const style = node.getAttribute('style') ?? '';
	const cleaned = style
		.split(';')
		.filter((rule) => {
			const trimmed = rule.trim();
			if (!trimmed) return false;
			const match = trimmed.match(/^color\s*:\s*(.+)$/i);
			if (!match) return true;
			return !isDarkColor(match[1]);
		})
		.join(';')
		.trim();

	if (cleaned) node.setAttribute('style', cleaned);
	else node.removeAttribute('style');
}

function integrateHtmlForDarkMode(root: ParentNode, darkMode: boolean) {
	if (!browser || !darkMode) return;

	const elements = root.querySelectorAll(
		'table, tbody, tr, td, th, div, p, span, section, center, font, li'
	);
	for (const element of elements) {
		stripLightBackground(element);
		stripDarkTextColor(element);
	}
}

function blockExternalContentInDocument(root: ParentNode, allowExternal: boolean): boolean {
	if (allowExternal) return false;

	let blockedExternal = false;
	for (const image of root.querySelectorAll('img')) {
		const src = image.getAttribute('src');
		if (src && isExternalUrl(src)) {
			image.setAttribute('data-blocked-src', src);
			image.removeAttribute('src');
			image.setAttribute('alt', '[Image blocked]');
			blockedExternal = true;
		}
	}

	for (const element of root.querySelectorAll('[style]')) {
		const style = element.getAttribute('style');
		if (style && /url\s*\(/i.test(style)) {
			element.setAttribute('style', style.replace(/url\s*\([^)]*\)/gi, 'none'));
			blockedExternal = true;
		}
	}

	return blockedExternal;
}

function hardenLinks(root: ParentNode) {
	for (const link of root.querySelectorAll('a')) {
		link.setAttribute('target', '_blank');
		link.setAttribute('rel', 'noopener noreferrer');
	}
}

function postProcessSanitizedHtml(
	html: string,
	options: { allowExternal: boolean; darkMode?: boolean }
): { html: string; blockedExternal: boolean } {
	if (!browser) {
		return {
			html: postProcessSanitizedHtmlString(html, options.allowExternal),
			blockedExternal: !options.allowExternal && hasExternalContent(html)
		};
	}

	const container = document.createElement('div');
	container.innerHTML = html;
	const blockedExternal = blockExternalContentInDocument(container, options.allowExternal);
	hardenLinks(container);
	const darkMode =
		options.darkMode ??
		(browser && document.documentElement.classList.contains('dark'));
	integrateHtmlForDarkMode(container, darkMode);

	return { html: container.innerHTML, blockedExternal };
}

function hasExternalContent(html: string): boolean {
	return /<img\b[^>]*\bsrc\s*=\s*(['"]?)(?:https?:\/\/|\/\/)/i.test(html) || /url\s*\(/i.test(html);
}

function postProcessSanitizedHtmlString(html: string, allowExternal: boolean): string {
	let next = html.replace(/<a\b/gi, '<a target="_blank" rel="noopener noreferrer"');
	if (allowExternal) return next;

	next = next.replace(/(<img\b[^>]*?)\s+src\s*=\s*(["']?)(https?:\/\/[^"'\s>]+|\/\/[^"'\s>]+)\2/gi, (_match, prefix, _quote, src) => {
		return `${prefix} data-blocked-src="${escapeHtml(src)}" alt="[Image blocked]"`;
	});
	next = next.replace(/\sstyle\s*=\s*(["'])([^"']*url\s*\([^"']*)\1/gi, (_match, quote, style) => {
		return ` style=${quote}${style.replace(/url\s*\([^)]*\)/gi, 'none')}${quote}`;
	});
	return next;
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
	options: { allowExternal: boolean; darkMode?: boolean }
): { html: string; blockedExternal: boolean } {
	const html = DOMPurify.sanitize(rawHtml, EMAIL_SANITIZE_CONFIG);
	return postProcessSanitizedHtml(html, options);
}

export function renderMessageBody(options: {
	bodyHtml?: string;
	bodyText: string;
	allowExternal: boolean;
	darkMode?: boolean;
	preferPlainText?: boolean;
}): { html: string; blockedExternal: boolean; isHtml: boolean } {
	if (options.preferPlainText && options.bodyText.trim()) {
		return {
			html: plainTextToSafeHtml(options.bodyText),
			blockedExternal: false,
			isHtml: false
		};
	}

	if (options.bodyHtml?.trim()) {
		const prepared = prepareEmailHtml(options.bodyHtml, {
			allowExternal: options.allowExternal,
			darkMode: options.darkMode
		});
		return { ...prepared, isHtml: true };
	}

	return {
		html: plainTextToSafeHtml(options.bodyText),
		blockedExternal: false,
		isHtml: false
	};
}
