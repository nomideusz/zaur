import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inlineImages } from '../src/lib/server/inline-images.ts';

const url = '/api/jmap/download?blobId=B1&amp;name=cat.png&amp;type=image%2Fpng&amp;inline=1';
const figure = (inner: string) =>
	`<figure data-trix-attachment="{&quot;url&quot;:&quot;x&quot;}" class="attachment attachment--preview">${inner}</figure>`;

test('inline images: a Trix figure becomes a cid image and an inline part', () => {
	const { html, parts } = inlineImages(`<div>Hi${figure(`<img src="${url}" width="1200" height="800"><figcaption class="attachment__caption"></figcaption>`)}</div>`);
	assert.equal(html, '<div>Hi<div><img src="cid:B1" alt="cat.png" width="600" height="400" style="max-width:100%;height:auto"></div></div>');
	assert.deepEqual(parts, [{ blobId: 'B1', name: 'cat.png', type: 'image/png', size: 0, cid: 'B1', disposition: 'inline' }]);
});

test('inline images: a written caption stays, the same image twice is one part', () => {
	const img = `<img src="${url}">`;
	const { html, parts } = inlineImages(
		figure(`${img}<figcaption class="attachment__caption attachment__caption--edited">The cat</figcaption>`) + figure(img)
	);
	assert.equal(html, '<div><img src="cid:B1" alt="cat.png" style="max-width:100%;height:auto"><br>The cat</div><div><img src="cid:B1" alt="cat.png" style="max-width:100%;height:auto"></div>');
	assert.equal(parts.length, 1);
});

test('inline images: still uploading, foreign, or not an image → dropped; other HTML untouched', () => {
	const pending = figure('<img src="data:image/png;base64,AAAA">');
	const pdf = `<img src="/api/jmap/download?blobId=B2&amp;type=application%2Fpdf">`;
	const remote = '<img src="https://example.com/a.png">';
	const { html, parts } = inlineImages(`<p>a</p>${pending}${pdf}${remote}`);
	assert.equal(html, `<p>a</p>${remote}`);
	assert.deepEqual(parts, []);
	assert.deepEqual(inlineImages(''), { html: '', parts: [] });
});
