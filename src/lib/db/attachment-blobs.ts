import { getMailDatabase } from './database';

const MAX_CACHED_BLOBS = 40;
const MAX_BLOB_BYTES = 5 * 1024 * 1024;

function docId(accountId: string, blobId: string): string {
	return `${accountId}:${blobId}`;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = '';
	const chunk = 0x8000;
	for (let i = 0; i < bytes.length; i += chunk) {
		binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
	}
	return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes.buffer;
}

export async function getCachedAttachmentBlob(
	accountId: string,
	blobId: string
): Promise<Blob | null> {
	const db = getMailDatabase();
	if (!db?.attachmentBlobs) return null;

	const doc = await db.attachmentBlobs.findOne({ selector: { id: docId(accountId, blobId) } }).exec();
	if (!doc) return null;

	return new Blob([base64ToArrayBuffer(doc.dataBase64)], { type: doc.type });
}

export async function cacheAttachmentBlob(
	accountId: string,
	blobId: string,
	name: string,
	type: string,
	data: ArrayBuffer
): Promise<void> {
	if (data.byteLength > MAX_BLOB_BYTES) return;

	const db = getMailDatabase();
	if (!db?.attachmentBlobs) return;

	await db.attachmentBlobs.upsert({
		id: docId(accountId, blobId),
		accountId,
		blobId,
		name,
		type,
		size: data.byteLength,
		dataBase64: arrayBufferToBase64(data),
		cachedAt: Date.now()
	});

	const overflow = await db.attachmentBlobs
		.find({
			selector: { accountId },
			sort: [{ cachedAt: 'asc' }],
			skip: MAX_CACHED_BLOBS
		})
		.exec();

	if (overflow.length) {
		await db.attachmentBlobs.bulkRemove(overflow.map((doc) => doc.primary));
	}
}

export async function isAttachmentCached(accountId: string, blobId: string): Promise<boolean> {
	const db = getMailDatabase();
	if (!db?.attachmentBlobs) return false;
	const doc = await db.attachmentBlobs.findOne({ selector: { id: docId(accountId, blobId) } }).exec();
	return !!doc;
}

export { MAX_BLOB_BYTES };
