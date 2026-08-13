import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	fileInlineImageUrl,
	imageNearPage,
	imagePreviewType,
	isImageFile
} from '../src/lib/files/image.ts';

describe('isImageFile', () => {
	it('detects raster images by type and extension', () => {
		assert.equal(isImageFile({ name: 'photo.jpg', type: 'application/octet-stream' }), true);
		assert.equal(isImageFile({ name: 'shot', type: 'image/png' }), true);
		assert.equal(isImageFile({ name: 'icon.WEBP', type: null }), true);
		assert.equal(isImageFile({ name: 'notes.md', type: 'text/markdown' }), false);
		assert.equal(isImageFile({ name: 'vector.svg', type: 'image/svg+xml' }), false);
		assert.equal(isImageFile({ name: 'Photos', type: null, nodeType: 'directory' }), false);
	});
});

describe('fileInlineImageUrl', () => {
	it('requests an inline raster type even when the node type is generic', () => {
		assert.equal(
			fileInlineImageUrl({ blobId: 'b1', name: 'cat.jpeg', type: 'application/octet-stream' }),
			'/api/jmap/download?blobId=b1&name=cat.jpeg&type=image%2Fjpeg&inline=1'
		);
		assert.equal(fileInlineImageUrl({ blobId: null, name: 'cat.jpeg', type: 'image/jpeg' }), null);
		assert.equal(fileInlineImageUrl({ blobId: 'b1', name: 'x.svg', type: 'image/svg+xml' }), null);
	});

	it('normalizes jpeg aliases', () => {
		assert.equal(imagePreviewType({ name: 'a.jpg', type: 'image/jpg' }), 'image/jpeg');
	});
});

describe('imageNearPage', () => {
	it('loads the current slide, neighbors, and loop wraparound', () => {
		assert.equal(imageNearPage(2, 2, 5), true);
		assert.equal(imageNearPage(1, 2, 5), true);
		assert.equal(imageNearPage(3, 2, 5), true);
		assert.equal(imageNearPage(0, 2, 5), false);
		assert.equal(imageNearPage(4, 0, 5), true);
		assert.equal(imageNearPage(0, 4, 5), true);
	});
});
