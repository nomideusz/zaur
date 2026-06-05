import { browser } from '$app/environment';
import type { MessageAttachment } from '$lib/types/mail';
import { isOfflineError } from '$lib/utils/network';

function triggerDownload(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = filename;
	anchor.click();
	URL.revokeObjectURL(url);
}

export async function getAttachmentBlob(attachment: MessageAttachment): Promise<Blob> {
	const { getAccountId, getCachedAttachmentBlob, cacheAttachmentBlob } = await import('$lib/db');
	const accountId = getAccountId();

	if (accountId) {
		const cached = await getCachedAttachmentBlob(accountId, attachment.blobId);
		if (cached) {
			return cached;
		}
	}

	const params = new URLSearchParams({
		blobId: attachment.blobId,
		name: attachment.name,
		type: attachment.type
	});

	try {
		const response = await fetch(`/api/jmap/download?${params}`);
		if (!response.ok) {
			throw new Error(`Download failed (${response.status})`);
		}

		const data = await response.arrayBuffer();
		const blob = new Blob([data], { type: attachment.type || 'application/octet-stream' });

		if (accountId) {
			await cacheAttachmentBlob(
				accountId,
				attachment.blobId,
				attachment.name,
				attachment.type,
				data
			);
		}

		return blob;
	} catch (error) {
		if (accountId && isOfflineError(error)) {
			const cached = await getCachedAttachmentBlob(accountId, attachment.blobId);
			if (cached) {
				return cached;
			}
		}
		throw error;
	}
}

export async function downloadAttachment(attachment: MessageAttachment): Promise<void> {
	if (!browser) return;
	const blob = await getAttachmentBlob(attachment);
	triggerDownload(blob, attachment.name);
}

export async function prefetchAttachments(attachments: MessageAttachment[]): Promise<void> {
	if (!browser || !navigator.onLine || !attachments.length) return;

	const { getAccountId, getCachedAttachmentBlob, cacheAttachmentBlob, MAX_BLOB_BYTES } =
		await import('$lib/db');
	const accountId = getAccountId();
	if (!accountId) return;

	for (const attachment of attachments) {
		if (attachment.size > MAX_BLOB_BYTES) continue;

		const cached = await getCachedAttachmentBlob(accountId, attachment.blobId);
		if (cached) continue;

		try {
			const params = new URLSearchParams({
				blobId: attachment.blobId,
				name: attachment.name,
				type: attachment.type
			});
			const response = await fetch(`/api/jmap/download?${params}`);
			if (!response.ok) continue;

			const data = await response.arrayBuffer();
			await cacheAttachmentBlob(
				accountId,
				attachment.blobId,
				attachment.name,
				attachment.type,
				data
			);
		} catch {
			// Prefetch is best-effort
		}
	}
}
