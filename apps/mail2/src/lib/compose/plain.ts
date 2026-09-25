/**
 * The text/plain part of a rich message: the editor's HTML read the way a
 * plain-text mail client wants it — a quote as "> " lines, a list with its
 * markers, a link with its address after the words, an image as "[image]".
 *
 * Trix writes a small, known dialect (div, br, strong, em, del, a, h1, pre,
 * blockquote, ul/ol/li, figure), so this reads tags rather than parsing any
 * HTML; an unknown tag is read as inline and its text kept.
 */

interface Element {
	tag: string;
	attrs: string;
	children: Node[];
}
type Node = string | Element;

const VOID = new Set(['br', 'img', 'hr', 'input', 'wbr']);
const BLOCK = new Set(['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre', 'li', 'table', 'tr']);
const TOKEN = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>|([^<]+)|</g;

export function richToText(html: string): string {
	return read(parse(html)).join('\n').replace(/\s+$/, '');
}

function parse(html: string): Node[] {
	const root: Element = { tag: '', attrs: '', children: [] };
	const stack = [root];
	for (const [token, closing, name, attrs = '', text] of html.matchAll(TOKEN)) {
		const top = stack[stack.length - 1]!;
		if (text !== undefined) top.children.push(decode(text));
		else if (token === '<') top.children.push('<');
		if (!name) continue;
		const tag = name.toLowerCase();
		if (closing) {
			const at = stack.findLastIndex((node) => node.tag === tag);
			if (at > 0) stack.length = at;
			continue;
		}
		const node: Element = { tag, attrs, children: [] };
		top.children.push(node);
		if (!VOID.has(tag) && !attrs.trimEnd().endsWith('/')) stack.push(node);
	}
	return root.children;
}

/** Nodes to lines. Inline content runs on the current line; a block starts its own. */
function read(nodes: Node[]): string[] {
	const out: string[] = [];
	let line: string | null = null;
	const flush = () => {
		if (line !== null) out.push(line);
		line = null;
	};
	/** Inline lines: the first continues this line, the last is left open. */
	const run = (parts: string[]) => {
		parts.forEach((part, i) => {
			if (i > 0) {
				out.push(line ?? '');
				line = null;
			}
			line = (line ?? '') + part;
		});
	};

	for (const node of nodes) {
		if (typeof node === 'string') {
			run(node.split('\n'));
			continue;
		}
		const { tag, children } = node;
		if (tag === 'br') {
			out.push(line ?? '');
			line = null;
		} else if (tag === 'img' || tag === 'figure') {
			// An image is its own line, as it is in the sent mail.
			flush();
			out.push('[image]');
			// A caption the writer typed is part of the letter.
			const caption = children.find((child) => typeof child !== 'string' && child.tag === 'figcaption');
			if (typeof caption === 'object') out.push(...read(caption.children).filter(Boolean));
		} else if (tag === 'blockquote') {
			flush();
			out.push(...read(children).map((text) => (text ? `> ${text}` : '>')));
		} else if (tag === 'ul' || tag === 'ol') {
			flush();
			let n = 0;
			for (const item of children) {
				if (typeof item === 'string') continue;
				const marker = tag === 'ol' ? `${++n}. ` : '- ';
				const pad = ' '.repeat(marker.length);
				read(item.children).forEach((text, i) => out.push((i === 0 ? marker : text ? pad : '') + text));
			}
		} else if (tag === 'a') {
			const words = read(children);
			const href = decode(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(node.attrs)?.slice(1).find(Boolean) ?? '');
			const said = words.join(' ').trim();
			const address = href.replace(/^mailto:/i, '');
			run(href && address !== said ? [...words.slice(0, -1), `${words.at(-1) ?? ''} <${address}>`] : words);
		} else if (BLOCK.has(tag)) {
			flush();
			out.push(...read(children));
		} else {
			run(read(children));
		}
	}
	flush();
	return out;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decode(text: string): string {
	return text
		.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, name: string) => {
			if (name[0] !== '#') return ENTITIES[name.toLowerCase()] ?? entity;
			const code = name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : Number(name.slice(1));
			return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
		})
		.replace(/[ ]/g, ' ')
		.replace(/[﻿​]/g, '');
}
