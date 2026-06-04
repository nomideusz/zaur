import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	extractInlineImages,
	inlineImageDownloadUrl,
	rewriteInlineCidImages
} from '../src/lib/email/inline-images.ts';

describe('inline email images', () => {
	it('maps inline image parts by normalized Content-ID', () => {
		const map = extractInlineImages({
			subParts: [
				{
					type: 'multipart/related',
					subParts: [
						{
							type: 'image/png',
							blobId: 'blob-1',
							cid: '<logo@mail>',
							name: 'logo.png'
						}
					]
				}
			]
		});

		assert.equal(map.size, 1);
		assert.deepEqual(map.get('logo@mail'), {
			blobId: 'blob-1',
			name: 'logo.png',
			type: 'image/png'
		});
	});

	it('rewrites cid image sources to same-origin download URLs', () => {
		const map = extractInlineImages({
			type: 'image/jpeg',
			blobId: 'blob-2',
			cid: 'photo@example',
			name: 'photo.jpg'
		});

		const html = '<p>Hi</p><img src="cid:photo@example" alt="photo">';
		const rewritten = rewriteInlineCidImages(html, map);
		const part = map.get('photo@example')!;

		assert.match(
			rewritten,
			new RegExp(`src="${inlineImageDownloadUrl(part).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`)
		);
	});

	it('leaves unknown cid sources unchanged', () => {
		const html = '<img src="cid:missing@example">';
		assert.equal(rewriteInlineCidImages(html, new Map()), html);
	});
});
