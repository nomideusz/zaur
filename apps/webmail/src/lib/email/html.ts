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

const NAMED_CSS_COLORS: Record<string, string> = {
	black: '#000000',
	white: '#ffffff',
	gray: '#808080',
	grey: '#808080',
	silver: '#c0c0c0',
	darkgray: '#a9a9a9',
	darkgrey: '#a9a9a9',
	dimgray: '#696969',
	dimgrey: '#696969',
	lightgray: '#d3d3d3',
	lightgrey: '#d3d3d3',
	gainsboro: '#dcdcdc',
	whitesmoke: '#f5f5f5',
	ghostwhite: '#f8f8ff',
	snow: '#fffafa',
	ivory: '#fffff0',
	seashell: '#fff5ee',
	linen: '#faf0e6',
	antiquewhite: '#faebd7',
	beige: '#f5f5dc',
	mintcream: '#f5fffa',
	azure: '#f0ffff',
	aliceblue: '#f0f8ff'
};

type Rgb = { r: number; g: number; b: number };

function expandHex(hex: string): string | null {
	const h = hex.replace('#', '');
	if (h.length === 3) return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
	if (h.length === 6) return `#${h}`;
	return null;
}

function parseCssColor(value: string): Rgb | null {
	const normalized = value.trim().toLowerCase();
	if (!normalized || normalized === 'transparent' || normalized === 'inherit' || normalized === 'initial') {
		return null;
	}

	const named = NAMED_CSS_COLORS[normalized];
	if (named) return parseCssColor(named);

	const hex = normalized.match(/^#([0-9a-f]{3,8})$/i);
	if (hex) {
		const expanded = expandHex(`#${hex[1]}`);
		if (!expanded) return null;
		const h = expanded.slice(1);
		return {
			r: parseInt(h.slice(0, 2), 16),
			g: parseInt(h.slice(2, 4), 16),
			b: parseInt(h.slice(4, 6), 16)
		};
	}

	const rgb = normalized.match(
		/^rgba?\(\s*([\d.]+)(%?)\s*,\s*([\d.]+)(%?)\s*,\s*([\d.]+)(%?)(?:\s*,\s*[\d.]+%?)?\s*\)$/i
	);
	if (rgb) {
		const channel = (n: number, pct: string) => (pct === '%' ? (n / 100) * 255 : n);
		return {
			r: Math.round(channel(Number(rgb[1]), rgb[2])),
			g: Math.round(channel(Number(rgb[3]), rgb[4])),
			b: Math.round(channel(Number(rgb[5]), rgb[6]))
		};
	}

	const hsl = normalized.match(
		/^hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%(?:\s*,\s*[\d.]+%?)?\s*\)$/i
	);
	if (hsl) {
		const h = Number(hsl[1]) / 360;
		const s = Number(hsl[2]) / 100;
		const l = Number(hsl[3]) / 100;
		const hue2rgb = (p: number, q: number, t: number) => {
			if (t < 0) t += 1;
			if (t > 1) t -= 1;
			if (t < 1 / 6) return p + (q - p) * 6 * t;
			if (t < 1 / 2) return q;
			if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
			return p;
		};
		let r: number;
		let g: number;
		let b: number;
		if (s === 0) {
			r = g = b = l;
		} else {
			const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
			const p = 2 * l - q;
			r = hue2rgb(p, q, h + 1 / 3);
			g = hue2rgb(p, q, h);
			b = hue2rgb(p, q, h - 1 / 3);
		}
		return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
	}

	return null;
}

function relativeLuminance({ r, g, b }: Rgb): number {
	const channel = (c: number) => {
		const s = c / 255;
		return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
	};
	return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Colors meant for white/light email backgrounds — strip in dark mode so theme text shows. */
function isDarkTextColor(value: string): boolean {
	const rgb = parseCssColor(value);
	if (!rgb) return false;
	return relativeLuminance(rgb) < 0.42;
}

/** Light text on explicit light email sections — strip so dark readable text shows. */
function isLightTextColor(value: string): boolean {
	const rgb = parseCssColor(value);
	if (!rgb) return false;
	return relativeLuminance(rgb) > 0.58;
}

/** Light card/section backgrounds inside HTML mail — keep and preserve their text colors. */
function isLightBackgroundColor(value: string): boolean {
	const rgb = parseCssColor(value);
	if (!rgb) return false;
	return relativeLuminance(rgb) > 0.74;
}

function elementBackgroundColor(element: HTMLElement): string | null {
	const bgcolor = element.getAttribute('bgcolor');
	if (bgcolor) return bgcolor;

	const style = element.getAttribute('style');
	if (!style) return null;

	for (const rule of style.split(';')) {
		const trimmed = rule.trim();
		const match = trimmed.match(/^(background(?:-color)?)\s*:\s*(.+)$/i);
		if (match) return match[2].trim();
	}
	return null;
}

function elementHasLightBackground(element: HTMLElement): boolean {
	const background = elementBackgroundColor(element);
	return background ? isLightBackgroundColor(background) : false;
}

function isWithinLightSurface(element: Element, root: ParentNode): boolean {
	let node: Element | null = element;
	while (node && node !== root) {
		if (node instanceof HTMLElement && node.hasAttribute('data-z-light-surface')) return true;
		node = node.parentElement;
	}
	return false;
}

function markLightSurfaces(root: ParentNode) {
	for (const element of root.querySelectorAll('*')) {
		if (element instanceof HTMLElement && elementHasLightBackground(element)) {
			element.setAttribute('data-z-light-surface', '');
		}
	}
}

function stripLightBackground(node: Element) {
	const bgcolor = node.getAttribute('bgcolor');
	if (bgcolor && isLightBackgroundColor(bgcolor)) {
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
			return !isLightBackgroundColor(match[2]);
		})
		.join(';')
		.trim();

	if (cleaned) node.setAttribute('style', cleaned);
	else node.removeAttribute('style');
}

function stripTextColor(node: Element, shouldStrip: (value: string) => boolean) {
	const color = node.getAttribute('color');
	if (color && shouldStrip(color)) {
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
			const value = match[1].trim();
			if (value === 'inherit' || value === 'initial' || value === 'unset') return true;
			return !shouldStrip(value);
		})
		.join(';')
		.trim();

	if (cleaned) node.setAttribute('style', cleaned);
	else node.removeAttribute('style');
}

function stripDarkTextColor(node: Element) {
	stripTextColor(node, isDarkTextColor);
}

function stripLightTextColor(node: Element) {
	stripTextColor(node, isLightTextColor);
}

function normalizeEmailBlockquotes(root: ParentNode) {
	for (const blockquote of root.querySelectorAll('blockquote')) {
		blockquote.classList.add('z-email-quote');
	}
}

function stripLightSurfaceTextColors(surface: Element) {
	stripLightTextColor(surface);
	for (const element of surface.querySelectorAll('*')) {
		stripLightTextColor(element);
	}
}

function integrateHtmlForDarkMode(root: ParentNode, darkMode: boolean) {
	if (!browser || !darkMode) return;

	markLightSurfaces(root);

	for (const surface of root.querySelectorAll('[data-z-light-surface]')) {
		stripLightSurfaceTextColors(surface);
	}

	for (const blockquote of root.querySelectorAll('blockquote')) {
		if (!(blockquote instanceof HTMLElement)) continue;
		if (isWithinLightSurface(blockquote, root)) continue;
		stripLightBackground(blockquote);
		stripDarkTextColor(blockquote);
		for (const element of blockquote.querySelectorAll('*')) {
			if (!(element instanceof HTMLElement)) continue;
			stripLightBackground(element);
			stripDarkTextColor(element);
		}
	}

	for (const element of root.querySelectorAll('*')) {
		if (!(element instanceof HTMLElement)) continue;
		if (element.tagName === 'BLOCKQUOTE') continue;
		if (isWithinLightSurface(element, root)) continue;
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

/**
 * "Clean reading view" — neutralizes a message's own typography and fixed sizing so it
 * re-flows into the app's reading column and type scale (similar to Safari Reader).
 * Structure is preserved; only presentational styling that fights the reader is removed.
 */
const CLEAN_VIEW_STRIP_STYLE_PROPS = new Set([
	'font',
	'font-family',
	'font-size',
	'font-stretch',
	'line-height',
	'letter-spacing',
	'word-spacing',
	'color',
	'background',
	'background-color',
	'background-image',
	'width',
	'min-width',
	'max-width',
	'height',
	'min-height',
	'max-height'
]);

const CLEAN_VIEW_STRIP_ATTRS = ['face', 'size', 'color', 'width', 'height', 'bgcolor', 'background', 'align'];

function cleanStyleAttribute(node: Element) {
	const style = node.getAttribute('style');
	if (!style) return;

	const kept = style
		.split(';')
		.map((rule) => rule.trim())
		.filter((rule) => {
			if (!rule) return false;
			const prop = rule.split(':')[0]?.trim().toLowerCase();
			return !prop || !CLEAN_VIEW_STRIP_STYLE_PROPS.has(prop);
		})
		.join('; ')
		.trim();

	if (kept) node.setAttribute('style', kept);
	else node.removeAttribute('style');
}

function applyCleanReadingView(root: ParentNode) {
	for (const element of root.querySelectorAll('*')) {
		const tag = element.tagName.toLowerCase();
		// Preserve image dimensions so they don't blow up to natural size.
		if (tag !== 'img') {
			for (const attr of CLEAN_VIEW_STRIP_ATTRS) element.removeAttribute(attr);
		}
		cleanStyleAttribute(element);
	}
}

function hardenLinks(root: ParentNode) {
	for (const link of root.querySelectorAll('a')) {
		link.setAttribute('target', '_blank');
		link.setAttribute('rel', 'noopener noreferrer');
	}
}

const PLAIN_QUOTE_PATTERNS = [
	/\n\n---\n(?:On .+ wrote:|Forwarded message:)/,
	/\n-{5,}\s*original message\s*-{5,}/i,
	/\nOn .+ wrote:\n/,
	/(?:^|\n)-{5,}\s*original message\s*-{5,}/i
];

const HTML_QUOTE_PATTERNS = [
	/-{5,}\s*original message\s*-{5,}/i,
	/\nOn .+ wrote:/i,
	/\n-{3,}\s*\nOn .+ wrote:/i,
	/\n-{3,}\nForwarded message:/i
];

export function normalizeEmailPlainText(text: string): string {
	return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function findQuoteStart(text: string, patterns: RegExp[]): number {
	let earliest = -1;
	for (const pattern of patterns) {
		const index = text.search(pattern);
		if (index >= 0 && (earliest < 0 || index < earliest)) {
			earliest = index;
		}
	}
	return earliest;
}

function splitElementAtTextOffset(root: HTMLElement, offset: number) {
	if (offset <= 0) return;

	const range = document.createRange();
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
	let remaining = offset;
	let startNode: Text | null = null;
	let startOffset = 0;

	while (walker.nextNode()) {
		const node = walker.currentNode as Text;
		if (remaining <= node.data.length) {
			startNode = node;
			startOffset = remaining;
			break;
		}
		remaining -= node.data.length;
	}

	if (!startNode) return;

	range.setStart(startNode, startOffset);
	range.setEnd(root, root.childNodes.length);

	const quote = document.createElement('blockquote');
	quote.className = 'z-email-quote';
	quote.appendChild(range.extractContents());
	root.appendChild(quote);
}

function wrapHtmlQuotedReplies(root: HTMLElement) {
	if (root.querySelector('.z-email-quote')) return;

	const offset = findQuoteStart(root.textContent ?? '', HTML_QUOTE_PATTERNS);
	if (offset > 0) {
		splitElementAtTextOffset(root, offset);
		return;
	}

	for (const child of Array.from(root.children)) {
		if (child instanceof HTMLElement && !child.classList.contains('z-email-quote')) {
			wrapHtmlQuotedReplies(child);
		}
	}
}

function postProcessSanitizedHtml(
	html: string,
	options: { allowExternal: boolean; darkMode?: boolean; cleanView?: boolean }
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
	wrapHtmlQuotedReplies(container);
	normalizeEmailBlockquotes(container);
	if (options.cleanView) applyCleanReadingView(container);
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

/** Start index of trailing quoted reply in plain-text bodies (Gmail, Proton, Apple Mail, etc.). */
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

export function prepareEmailHtml(
	rawHtml: string,
	options: { allowExternal: boolean; darkMode?: boolean; cleanView?: boolean }
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
	cleanView?: boolean;
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
			darkMode: options.darkMode,
			cleanView: options.cleanView
		});
		const textHasQuote =
			options.bodyText.trim() && findPlainTextQuoteStart(options.bodyText) >= 0;
		const htmlHasQuote = prepared.html.includes('z-email-quote');
		if (textHasQuote && !htmlHasQuote) {
			return {
				html: plainTextToSafeHtml(options.bodyText),
				blockedExternal: prepared.blockedExternal,
				isHtml: false
			};
		}
		return { ...prepared, isHtml: true };
	}

	return {
		html: plainTextToSafeHtml(options.bodyText),
		blockedExternal: false,
		isHtml: false
	};
}
