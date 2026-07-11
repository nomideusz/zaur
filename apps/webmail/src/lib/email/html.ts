import DOMPurify from 'dompurify';
import { browser } from '$app/environment';
import {
	escapeHtml,
	findQuoteStart,
	findPlainTextQuoteStart,
	plainTextToSafeHtml
} from '@zaur/mail-core/email/text';

export {
	normalizeEmailPlainText,
	findPlainTextQuoteStart,
	plainTextExcerpt,
	plainTextToSafeHtml
} from '@zaur/mail-core/email/text';

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

function isExternalUrl(url: string): boolean {
	return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//');
}

type Rgb = { r: number; g: number; b: number };

// The browser parses any CSS color (named, hex, rgb/hsl/oklch, modern syntax)
// when assigned to an inline style; reading it back yields a canonical rgb()/
// rgba() serialization. Callers all run in the DOM post-processing pass, so
// document is always available here.
let colorProbe: HTMLSpanElement | null = null;

function parseCssColor(value: string): Rgb | null {
	const input = value.trim();
	if (!input || typeof document === 'undefined') return null;
	colorProbe ??= document.createElement('span');
	colorProbe.style.color = '';
	colorProbe.style.color = input;
	const serialized = colorProbe.style.color;
	const match = serialized.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/);
	if (!match) return null;
	if (match[4] !== undefined && Number(match[4]) === 0) return null;
	return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]) };
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

function isWithinDarkSurface(element: Element, root: ParentNode): boolean {
	let node: Element | null = element;
	while (node && node !== root) {
		if (node instanceof HTMLElement && node.hasAttribute('data-z-dark-surface')) return true;
		node = node.parentElement;
	}
	return false;
}

/**
 * A light-authored email rendered on the white reading card keeps its own colours, but inline
 * light text (meant for the email's dark bands) would vanish on the card. Strip light text colours
 * except inside the email's own dark-background islands — the mirror of the dark-mode pass, so a
 * dark header keeps its white text while light-on-light body copy falls back to the card's dark ink.
 */
function neutralizeLightCardText(root: ParentNode) {
	if (!browser) return;

	for (const element of root.querySelectorAll('*')) {
		if (!(element instanceof HTMLElement)) continue;
		const background = elementBackgroundColor(element);
		if (background && isDarkBackgroundColor(background)) {
			element.setAttribute('data-z-dark-surface', '');
		}
	}

	for (const element of root.querySelectorAll('*')) {
		if (!(element instanceof HTMLElement)) continue;
		if (isWithinDarkSurface(element, root)) continue;
		stripLightTextColor(element);
	}
}

/** Backgrounds the email author clearly intends as a dark page/canvas. */
function isDarkBackgroundColor(value: string): boolean {
	const rgb = parseCssColor(value);
	if (!rgb) return false;
	return relativeLuminance(rgb) < 0.3;
}

/** Structural wrappers that typically carry the email's page background. */
const PAGE_BACKGROUND_SELECTOR = 'body, table, tbody, tr, td, center, section, article, div';

/**
 * True when the email declares a dark page background — i.e. it was authored for dark.
 * The first structural wrapper with an explicit background sets the page intent; emails
 * with no declared background (the common case) are treated as light-authored.
 */
function emailIsDarkAuthored(root: ParentNode): boolean {
	for (const element of root.querySelectorAll(PAGE_BACKGROUND_SELECTOR)) {
		if (!(element instanceof HTMLElement)) continue;
		const background = elementBackgroundColor(element);
		if (!background) continue;
		if (!parseCssColor(background)) continue;
		return isDarkBackgroundColor(background);
	}
	return false;
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

function hardenLinks(root: ParentNode) {
	for (const link of root.querySelectorAll('a')) {
		link.setAttribute('target', '_blank');
		link.setAttribute('rel', 'noopener noreferrer');
	}
}

const HTML_QUOTE_PATTERNS = [
	/-{5,}\s*original message\s*-{5,}/i,
	/\nOn .+ wrote:/i,
	/\n-{3,}\s*\nOn .+ wrote:/i,
	/\n-{3,}\nForwarded message:/i
];

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
	options: { allowExternal: boolean; darkMode?: boolean }
): { html: string; blockedExternal: boolean; lightSurface: boolean } {
	if (!browser) {
		return {
			html: postProcessSanitizedHtmlString(html, options.allowExternal),
			blockedExternal: !options.allowExternal && hasExternalContent(html),
			lightSurface: false
		};
	}

	const container = document.createElement('div');
	container.innerHTML = html;
	const blockedExternal = blockExternalContentInDocument(container, options.allowExternal);
	hardenLinks(container);
	wrapHtmlQuotedReplies(container);
	normalizeEmailBlockquotes(container);
	const darkMode =
		options.darkMode ??
		(browser && document.documentElement.classList.contains('dark'));

	let lightSurface = false;
	if (darkMode) {
		// HTML email is authored for a light background. Render any light-authored message on a
		// light card with the author's original colors untouched — adapting colors region-by-region
		// goes wrong on mixed nesting (e.g. a dark bar inside a white card lost its white text).
		// Only genuinely dark-authored mail keeps the adaptive path.
		lightSurface = !emailIsDarkAuthored(container);
		if (lightSurface) {
			neutralizeLightCardText(container);
		} else {
			integrateHtmlForDarkMode(container, true);
		}
	}

	return { html: container.innerHTML, blockedExternal, lightSurface };
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
export function prepareEmailHtml(
	rawHtml: string,
	options: { allowExternal: boolean; darkMode?: boolean }
): { html: string; blockedExternal: boolean; lightSurface: boolean } {
	const html = DOMPurify.sanitize(rawHtml, EMAIL_SANITIZE_CONFIG);
	return postProcessSanitizedHtml(html, options);
}

export function renderMessageBody(options: {
	bodyHtml?: string;
	bodyText: string;
	allowExternal: boolean;
	darkMode?: boolean;
	preferPlainText?: boolean;
}): { html: string; blockedExternal: boolean; isHtml: boolean; lightSurface: boolean } {
	if (options.preferPlainText && options.bodyText.trim()) {
		return {
			html: plainTextToSafeHtml(options.bodyText),
			blockedExternal: false,
			isHtml: false,
			lightSurface: false
		};
	}

	if (options.bodyHtml?.trim()) {
		const prepared = prepareEmailHtml(options.bodyHtml, {
			allowExternal: options.allowExternal,
			darkMode: options.darkMode
		});
		const textHasQuote =
			options.bodyText.trim() && findPlainTextQuoteStart(options.bodyText) >= 0;
		const htmlHasQuote = prepared.html.includes('z-email-quote');
		if (textHasQuote && !htmlHasQuote) {
			return {
				html: plainTextToSafeHtml(options.bodyText),
				blockedExternal: prepared.blockedExternal,
				isHtml: false,
				lightSurface: false
			};
		}
		return { ...prepared, isHtml: true };
	}

	return {
		html: plainTextToSafeHtml(options.bodyText),
		blockedExternal: false,
		isHtml: false,
		lightSurface: false
	};
}
