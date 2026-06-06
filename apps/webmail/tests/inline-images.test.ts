import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	buildInlineImageMapFromAttachments,
	extractInlineImages,
	inlineHtmlForDisplay,
	inlineHtmlForStorage,
	inlineImageDownloadUrl,
	rewriteInlineCidImages,
	rewriteInlineDownloadUrlsToCid
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

		assert.equal(map.size, 2);
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

	it('maps compose attachments by cid and blobId', () => {
		const map = buildInlineImageMapFromAttachments([
			{
				blobId: 'blob-3',
				name: 'photo.png',
				type: 'image/png',
				cid: 'blob-3',
				disposition: 'inline'
			}
		]);

		assert.equal(map.size, 1);
		assert.deepEqual(map.get('blob-3'), {
			blobId: 'blob-3',
			name: 'photo.png',
			type: 'image/png'
		});
	});

	it('round-trips display and storage HTML for inline images', () => {
		const attachments = [
			{
				blobId: 'blob-4',
				name: 'inline.png',
				type: 'image/png',
				cid: 'blob-4',
				disposition: 'inline'
			}
		];
		const stored = '<p>Hi</p><img src="cid:blob-4" alt="inline">';
		const display = inlineHtmlForDisplay(stored, attachments);

		assert.match(display, /src="\/api\/jmap\/download\?/);
		assert.equal(inlineHtmlForStorage(display, attachments), stored);
	});

	it('rewrites download URLs back to cid for outbound HTML', () => {
		const part = {
			blobId: 'blob-5',
			name: 'inline.png',
			type: 'image/png'
		};
		const html = `<img src="${inlineImageDownloadUrl(part)}" alt="inline">`;
		const rewritten = rewriteInlineDownloadUrlsToCid(html, [{ blobId: 'blob-5', cid: 'blob-5' }]);

		assert.match(rewritten, /src="cid:blob-5"/);
	});
});
