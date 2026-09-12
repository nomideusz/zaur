import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
	MAX_ATTACHMENT_BYTES,
	MAX_ATTACHMENT_COUNT,
	attachmentKind,
	formatAttachmentSize,
	outgoingAttachments,
	attachmentFromServer
} from '../src/lib/compose/attachments.ts';
import type { DraftAttachment } from '../src/lib/compose/types.ts';

function chip(overrides: Partial<DraftAttachment> = {}): DraftAttachment {
	return {
		id: 'a1',
		name: 'report.pdf',
		type: 'application/pdf',
		size: 1024,
		blobId: 'blob-1',
		status: 'ready',
		...overrides
	};
}

test('attachment caps match the client and server contract', () => {
	assert.equal(MAX_ATTACHMENT_BYTES, 25 * 1024 * 1024);
	assert.equal(MAX_ATTACHMENT_COUNT, 10);
});

test('attachmentKind: extension wins, then MIME fallback, then "file"', () => {
	assert.equal(attachmentKind('report.pdf', 'application/pdf'), 'pdf');
	assert.equal(attachmentKind('Photo.JPG', 'image/jpeg'), 'jpg');
	// Overly long extensions are not trusted as labels.
	assert.equal(attachmentKind('archive.backup7', 'application/zip'), 'zip');
	assert.equal(attachmentKind('image', 'image/png'), 'png');
	assert.equal(attachmentKind('notes', 'text/plain'), 'txt');
	assert.equal(attachmentKind('notes', 'text/csv'), 'csv');
	assert.equal(attachmentKind('song', 'audio/mpeg'), 'mpeg');
	assert.equal(attachmentKind('clip', 'video/mp4'), 'mp4');
	assert.equal(attachmentKind('blob', ''), 'file');
	assert.equal(attachmentKind('blob', 'application/x-weird'), 'file');
});

test('formatAttachmentSize: bytes, KB, MB rounding', () => {
	assert.equal(formatAttachmentSize(0), '0 B');
	assert.equal(formatAttachmentSize(-5), '0 B');
	assert.equal(formatAttachmentSize(512), '512 B');
	assert.equal(formatAttachmentSize(1023), '1023 B');
	assert.equal(formatAttachmentSize(1024), '1 KB');
	assert.equal(formatAttachmentSize(22 * 1024), '22 KB');
	assert.equal(formatAttachmentSize(612 * 1024), '612 KB');
	assert.equal(formatAttachmentSize(Math.round(1.5 * 1024 * 1024)), '1.5 MB');
	assert.equal(formatAttachmentSize(15 * 1024 * 1024), '15 MB');
});

test('outgoingAttachments: ready chips only, mapped to the wire shape', () => {
	const list = [
		chip(),
		chip({ id: 'a2', name: 'notes.txt', type: 'text/plain', status: 'uploading' }),
		chip({ id: 'a3', name: 'shot.png', type: 'image/png', status: 'error' }),
		chip({ id: 'a4', name: 'orphan.bin', type: 'application/octet-stream', blobId: null })
	];
	assert.deepEqual(outgoingAttachments(list), [
		{ blobId: 'blob-1', name: 'report.pdf', type: 'application/pdf', size: 1024 }
	]);
	assert.deepEqual(outgoingAttachments([]), []);
});

test('attachmentFromServer: rehydrates a chip with fallbacks and a fresh id', () => {
	const part = { blobId: 'blob-9', name: '', type: '', size: 2048 };
	const restored = attachmentFromServer(part);
	assert.equal(restored.name, 'attachment');
	assert.equal(restored.type, 'application/octet-stream');
	assert.equal(restored.size, 2048);
	assert.equal(restored.blobId, 'blob-9');
	assert.equal(restored.status, 'ready');
	assert.match(restored.id, /^[0-9a-f-]{36}$/);
});
