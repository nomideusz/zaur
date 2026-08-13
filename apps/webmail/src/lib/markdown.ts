import { escapeHtml } from '@zaur/mail-core/email/text';
import DOMPurify from 'dompurify';
import { Marked, type Tokens } from 'marked';

/** Refuse to render huge blobs inline — download handles those. */
export const MAX_MARKDOWN_BYTES = 1024 * 1024;

const MARKDOWN_TYPES = new Set(['text/markdown', 'text/x-markdown']);
const MARKDOWN_EXT = /\.(md|markdown|mdown|mkd)$/i;

const MARKDOWN_SANITIZE = {
	ALLOWED_TAGS: [
		'p',
		'br',
		'h1',
		'h2',
		'h3',
		'h4',
		'h5',
		'h6',
		'ul',
		'ol',
		'li',
		'blockquote',
		'pre',
		'code',
		'a',
		'em',
		'strong',
		'del',
		'hr',
		'img',
		'table',
		'thead',
		'tbody',
		'tr',
		'th',
		'td',
		'span'
	],
	ALLOWED_ATTR: ['href', 'title', 'alt', 'src', 'target', 'rel', 'id', 'loading', 'referrerpolicy', 'class'],
	ALLOW_DATA_ATTR: false,
	ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|#)/i
};

export function stripBom(text: string): string {
	return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

export function isMarkdownFile(file: { name: string; type?: string | null }): boolean {
	const type = (file.type || '').toLowerCase().split(';')[0].trim();
	if (MARKDOWN_TYPES.has(type)) return true;
	return MARKDOWN_EXT.test(file.name);
}

export function canPreviewMarkdown(file: {
	name: string;
	type?: string | null;
	size?: number | null;
}): boolean {
	if (!isMarkdownFile(file)) return false;
	return !file.size || file.size <= MAX_MARKDOWN_BYTES;
}

function isSafeHref(href: string): boolean {
	const trimmed = href.trim();
	if (!trimmed) return false;
	if (trimmed === '#' || /^#[A-Za-z][\w:.-]*$/.test(trimmed)) return true;
	if (/^javascript:|^vbscript:|^data:/i.test(trimmed)) return false;
	return /^https?:\/\//i.test(trimmed) || /^mailto:[^\s]+$/i.test(trimmed);
}

function headingId(html: string): string {
	return html
		.replace(/<[^>]+>/g, '')
		.trim()
		.toLowerCase()
		.replace(/[^\p{L}\p{N}\s-]/gu, '')
		.replace(/\s+/g, '-');
}

const parser = new Marked();
parser.use({
	gfm: true,
	breaks: false,
	silent: true,
	renderer: {
		html({ text }: Tokens.HTML | Tokens.Tag) {
			return escapeHtml(text);
		},
		link({ href, title, tokens }: Tokens.Link) {
			const body = this.parser.parseInline(tokens);
			if (!href || !isSafeHref(href)) return body;
			const safe = href.trim();
			const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
			if (safe.startsWith('#')) {
				return `<a href="${escapeHtml(safe)}"${titleAttr}>${body}</a>`;
			}
			return `<a href="${escapeHtml(safe)}"${titleAttr} target="_blank" rel="noopener noreferrer">${body}</a>`;
		},
		image({ href, title, text }: Tokens.Image) {
			if (!href || !isSafeHref(href) || href.trim().startsWith('#') || /^mailto:/i.test(href)) {
				return escapeHtml(text || '');
			}
			const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
			return `<img src="${escapeHtml(href.trim())}" alt="${escapeHtml(text || '')}"${titleAttr} loading="lazy" referrerpolicy="no-referrer">`;
		},
		checkbox({ checked }: Tokens.Checkbox) {
			return checked
				? '<span class="z-md-task" aria-hidden="true">☑</span> '
				: '<span class="z-md-task" aria-hidden="true">☐</span> ';
		},
		heading({ tokens, depth }: Tokens.Heading) {
			const body = this.parser.parseInline(tokens);
			const id = headingId(body);
			const idAttr = id ? ` id="${escapeHtml(id)}"` : '';
			return `<h${depth}${idAttr}>${body}</h${depth}>\n`;
		}
	}
});

export function renderMarkdown(source: string): string {
	let html: string;
	try {
		html = parser.parse(stripBom(source), { async: false });
	} catch {
		html = `<pre>${escapeHtml(source)}</pre>`;
	}
	if (typeof document !== 'undefined') {
		html = DOMPurify.sanitize(html, MARKDOWN_SANITIZE);
	}
	return html;
}
