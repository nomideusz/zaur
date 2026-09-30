import DOMPurify from 'dompurify';
import { browser } from '$app/environment';
import {
	findQuoteStart,
	findPlainTextQuoteStart,
	plainTextToSafeHtml
} from '@zaur/mail-core/email/text';
import { classifyUrl, classifySrcset, inlineImageSrc, linkAllowed, type UrlKind } from './urls';

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

/**
 * Untrusted markup is only ever parsed into a document with no browsing
 * context, where nothing loads. A node made by the live `document` starts
 * fetching its images the moment it is parsed — WebKit does so even for a
 * detached <div> — which is before anything below has had a chance to block them.
 */
function parseInert(html: string): HTMLElement {
	const inert = document.implementation.createHTMLDocument('');
	inert.body.innerHTML = html;
	return inert.body;
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

/** The attributes that fetch on their own: <img>/<source>/<video>/<audio>, and table backgrounds. */
const FETCHING_ATTRS = ['src', 'srcset', 'poster', 'background'];

/**
 * What may fetch from an inline style: url(), image-set() and its bare strings,
 * the drafts' src() and image(), or an escape spelling any of them.
 */
const CSS_MAY_FETCH = /(url|src|image|image-set)\(|\\/i;
/** A url() as the browser writes it back: closed, its address free of quotes, brackets and escapes. */
const CSS_URL = /url\((["']?)([^"'()\\\s]*)\1\)/gi;
/** What is left once those are accounted for: a url() of another shape, an escape, image-set's strings. */
const CSS_STRAY = /(url|src|image)\(|\\|image-set\([^;]*["']/i;

/**
 * What a blocked image leaves behind: an empty picture of the size the mail
 * gave it, so the layout holds and nothing draws a broken-image glyph. The
 * frame draws `[data-blocked-src]` as a quiet box (frame.ts).
 */
function blockedImagePlaceholder(image: Element): string {
	const width = Number(image.getAttribute('width')) || 96;
	const height = Number(image.getAttribute('height')) || 64;
	return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'/%3E`;
}

/**
 * Takes out what the mail would make the browser fetch when it is shown.
 * Another server's content waits for the reader's yes, and is what raises the
 * "images hidden" notice. The app's own addresses are never the mail's to
 * fetch, asked or not (urls.ts); only an inline image passes. The frame's own
 * CSP (frame.ts) is what holds if something slips past this.
 */
function blockFetchesInDocument(root: ParentNode, allowExternal: boolean): boolean {
	const origin = location.origin;
	const keep = (kind: UrlKind) => kind === 'inert' || (kind === 'remote' && allowExternal);

	let blockedExternal = false;
	for (const element of root.querySelectorAll('[src], [srcset], [poster], [background]')) {
		let blocked = false;
		for (const name of FETCHING_ATTRS) {
			const value = element.getAttribute(name);
			if (value === null) continue;
			const inline = name === 'src' && element.tagName === 'IMG' ? inlineImageSrc(value, origin) : null;
			if (inline) {
				element.setAttribute(name, inline);
				continue;
			}
			const kind = name === 'srcset' ? classifySrcset(value, origin) : classifyUrl(value, origin);
			if (keep(kind)) continue;
			element.removeAttribute(name);
			if (kind === 'remote') blocked = true;
		}
		if (!blocked) continue;
		blockedExternal = true;
		if (element.tagName === 'IMG' && !element.hasAttribute('src')) {
			element.setAttribute('data-blocked-src', '');
			element.setAttribute('src', blockedImagePlaceholder(element));
			if (!element.hasAttribute('alt')) element.setAttribute('alt', '');
		}
	}

	for (const element of root.querySelectorAll<HTMLElement>('[style]')) {
		if (!CSS_MAY_FETCH.test(element.getAttribute('style') ?? '')) continue;
		// Read what the browser made of the style, not what was written: escapes
		// are resolved there (`\75rl(`) and every url() is closed and quoted.
		const style = element.style.cssText.replace(CSS_URL, (whole, _quote, url: string) => {
			const kind = classifyUrl(url, origin);
			if (keep(kind)) return whole;
			if (kind === 'remote') blockedExternal = true;
			return 'none';
		});
		// Something that may still fetch, in a form not read above, takes the whole style with it.
		if (CSS_STRAY.test(style.replace(CSS_URL, ''))) element.removeAttribute('style');
		else element.setAttribute('style', style);
	}

	return blockedExternal;
}

/** `mailto:ada@example.com?subject=…` as this app's own compose link, `/?to=`. */
function composeHref(href: string): string | null {
	const to = /^\s*mailto:([^?#]+)/i.exec(href)?.[1];
	if (!to) return null;
	try {
		return `/?to=${encodeURIComponent(decodeURIComponent(to))}`;
	} catch {
		return null;
	}
}

function hardenLinks(root: ParentNode) {
	// <area> too: an image map is a link, and without a target it navigates the frame itself.
	for (const link of root.querySelectorAll('a, area')) {
		// An address in a message opens a draft here rather than in the system's
		// mail client. In a new tab, like every link: the frame's sandbox does not
		// let it navigate the app it sits in, and is not widened for this.
		const href = link.getAttribute('href');
		const compose = composeHref(href ?? '');
		if (compose) link.setAttribute('href', compose);
		// The mail's own addresses into this app are dropped, bar a page named
		// in full (urls.ts); the link stays, as text.
		else if (href !== null && !linkAllowed(href, location.origin)) link.removeAttribute('href');
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

	// The root's own (inert) document, not the live one: see `parseInert`.
	const doc = root.ownerDocument;
	const range = doc.createRange();
	const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
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

	const quote = doc.createElement('blockquote');
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
	const container = parseInert(html);
	const blockedExternal = blockFetchesInDocument(container, options.allowExternal);
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

/** Start index of trailing quoted reply in plain-text bodies (Gmail, Proton, Apple Mail, etc.). */
/* Fixed-width table/div wrappers inflate a containing table's min-content width, which CSS
   max-width cannot shrink — the classic 600px marketing-email card nested in a 100% outer
   table. Tag them here; the frame's narrow-media CSS reflows [data-z-fixed-width] to 100%.
   Incoming data-* attrs are stripped (ALLOW_DATA_ATTR: false), so the tag can't be spoofed.
   ponytail: fixed-width td/th keep their width — the e2e-covered scroll fallback. */
const FIXED_WIDTH_REFLOW_MIN_PX = 480;

function fixedPxWidth(el: Element): number | null {
	const attr = el.getAttribute('width')?.trim();
	if (attr && /^\d+$/.test(attr)) return Number(attr);
	const style = el instanceof HTMLElement ? el.style.width.trim() : '';
	const match = /^(\d+(?:\.\d+)?)px$/.exec(style);
	return match ? Number(match[1]) : null;
}

let reflowHookAdded = false;

function ensureReflowHook() {
	if (reflowHookAdded || !browser) return;
	reflowHookAdded = true;
	DOMPurify.addHook('afterSanitizeAttributes', (node) => {
		if (node.tagName !== 'TABLE' && node.tagName !== 'DIV') return;
		const width = fixedPxWidth(node);
		if (width !== null && width >= FIXED_WIDTH_REFLOW_MIN_PX) {
			node.setAttribute('data-z-fixed-width', '');
		}
	});
}

export function prepareEmailHtml(
	rawHtml: string,
	options: { allowExternal: boolean; darkMode?: boolean }
): { html: string; blockedExternal: boolean; lightSurface: boolean } {
	// No DOM to sanitize in (the server, or DOMPurify failed to load): show nothing rather than the raw message.
	if (!browser || typeof DOMPurify?.sanitize !== 'function') {
		return { html: '', blockedExternal: false, lightSurface: false };
	}
	ensureReflowHook();
	const html = DOMPurify.sanitize(rawHtml, EMAIL_SANITIZE_CONFIG);
	return postProcessSanitizedHtml(html, options);
}

/**
 * Tuck each outermost quote behind a native <details>. The email frame runs no
 * scripts, and <details> needs none; the frame's ResizeObserver follows the toggle.
 */
function foldQuotedHistory(html: string): string {
	if (!browser || !html.includes('z-email-quote')) return html;
	const container = parseInert(html);
	const doc = container.ownerDocument;
	for (const quote of container.querySelectorAll('.z-email-quote')) {
		if (quote.parentElement?.closest('.z-email-quote')) continue;
		const fold = doc.createElement('details');
		fold.className = 'z-email-fold';
		const summary = doc.createElement('summary');
		summary.textContent = 'Quoted text';
		quote.replaceWith(fold);
		fold.append(summary, quote);
	}
	return container.innerHTML;
}

interface RenderOptions {
	bodyHtml?: string;
	bodyText: string;
	allowExternal: boolean;
	darkMode?: boolean;
	preferPlainText?: boolean;
	/**
	 * Fold the quoted original away. For a message whose thread already shows
	 * the earlier messages above it: the quote is the same text a second time.
	 */
	foldQuotes?: boolean;
}

type RenderedBody = { html: string; blockedExternal: boolean; isHtml: boolean; lightSurface: boolean };

/** Plain text's links are made by the linkifier; they follow the same rule as HTML mail's. */
function plainTextHtml(text: string): string {
	const html = plainTextToSafeHtml(text);
	if (!browser || !html.includes('<a ')) return html;
	const container = parseInert(html);
	hardenLinks(container);
	return container.innerHTML;
}

export function renderMessageBody(options: RenderOptions): RenderedBody {
	const body = renderBody(options);
	return options.foldQuotes ? { ...body, html: foldQuotedHistory(body.html) } : body;
}

function renderBody(options: RenderOptions): RenderedBody {
	if (options.preferPlainText && options.bodyText.trim()) {
		return {
			html: plainTextHtml(options.bodyText),
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
				html: plainTextHtml(options.bodyText),
				blockedExternal: prepared.blockedExternal,
				isHtml: false,
				lightSurface: false
			};
		}
		return { ...prepared, isHtml: true };
	}

	return {
		html: plainTextHtml(options.bodyText),
		blockedExternal: false,
		isHtml: false,
		lightSurface: false
	};
}
