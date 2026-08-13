import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	canPreviewMarkdown,
	isMarkdownFile,
	MAX_MARKDOWN_BYTES,
	renderMarkdown
} from '../src/lib/markdown.ts';

describe('isMarkdownFile', () => {
	it('detects markdown by extension and type', () => {
		assert.equal(isMarkdownFile({ name: 'notes.md', type: 'application/octet-stream' }), true);
		assert.equal(isMarkdownFile({ name: 'README.markdown', type: null }), true);
		assert.equal(isMarkdownFile({ name: 'doc', type: 'text/markdown' }), true);
		assert.equal(isMarkdownFile({ name: 'doc.txt', type: 'text/x-markdown' }), true);
		assert.equal(isMarkdownFile({ name: 'notes.txt', type: 'text/plain' }), false);
		assert.equal(isMarkdownFile({ name: 'photo.png', type: 'image/png' }), false);
	});

	it('skips preview for oversized files', () => {
		assert.equal(canPreviewMarkdown({ name: 'notes.md', size: 12 }), true);
		assert.equal(canPreviewMarkdown({ name: 'notes.md', size: MAX_MARKDOWN_BYTES + 1 }), false);
		assert.equal(canPreviewMarkdown({ name: 'notes.txt', size: 12 }), false);
	});
});

describe('renderMarkdown', () => {
	it('renders headings, emphasis, lists, and fenced code', () => {
		const html = renderMarkdown('# Hello\n\nThis is **bold** and *italic*.\n\n- one\n- two\n\n```js\nconst x = 1;\n```\n');
		assert.match(html, /<h1 id="hello">Hello<\/h1>/);
		assert.match(html, /<strong>bold<\/strong>/);
		assert.match(html, /<em>italic<\/em>/);
		assert.match(html, /<li>one<\/li>/);
		assert.match(html, /<pre><code class="language-js">const x = 1;\n<\/code><\/pre>/);
	});

	it('renders GFM tables and strikethrough', () => {
		const html = renderMarkdown('| A | B |\n| --- | --- |\n| 1 | 2 |\n\n~~gone~~\n');
		assert.match(html, /<table>/);
		assert.match(html, /<th>A<\/th>/);
		assert.match(html, /<td>1<\/td>/);
		assert.match(html, /<del>gone<\/del>/);
	});

	it('escapes raw HTML instead of executing it', () => {
		const html = renderMarkdown('<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n');
		assert.doesNotMatch(html, /<script/i);
		assert.doesNotMatch(html, /<img/i);
		assert.match(html, /&lt;script&gt;/);
		assert.match(html, /&lt;img /);
	});

	it('drops javascript and data URLs from links and images', () => {
		const html = renderMarkdown(
			'[click](javascript:alert(1))\n\n[ok](https://zaur.app)\n\n![x](javascript:alert(1))\n\n![pic](https://zaur.app/a.png)\n'
		);
		assert.doesNotMatch(html, /javascript:/i);
		assert.match(html, />click</);
		assert.match(html, /href="https:\/\/zaur\.app"/);
		assert.match(html, /target="_blank"/);
		assert.match(html, /src="https:\/\/zaur\.app\/a\.png"/);
		assert.doesNotMatch(html, /<img[^>]+alt="x"/);
	});

	it('keeps in-document heading links without opening a new tab', () => {
		const html = renderMarkdown('[Go](#hello-world)\n\n## Hello world\n');
		assert.match(html, /<a href="#hello-world">Go<\/a>/);
		assert.doesNotMatch(html, /href="#hello-world"[^>]*target=/);
		assert.match(html, /<h2 id="hello-world">Hello world<\/h2>/);
	});

	it('strips a leading BOM', () => {
		const html = renderMarkdown('\uFEFF# Title\n');
		assert.match(html, /<h1 id="title">Title<\/h1>/);
	});
});
