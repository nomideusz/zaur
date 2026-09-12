import type { DraftAttachment, OutgoingAttachment } from './types';

export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
export const MAX_ATTACHMENT_COUNT = 10;

/**
 * Short mono badge label: the file's extension when there is one, else a
 * readable summary of the MIME type. 'report.pdf' → pdf, an extensionless
 * image/png → png, anything unrecognized → file.
 */
export function attachmentKind(name: string, type: string): string {
	const ext = name.includes('.') ? (name.split('.').pop() ?? '').toLowerCase() : '';
	if (ext && /^[a-z0-9]{1,5}$/.test(ext)) return ext;
	const mime = type.toLowerCase();
	if (mime.startsWith('image/')) return mime.slice('image/'.length) || 'image';
	if (mime.startsWith('text/')) {
		const subtype = mime.slice('text/'.length);
		return (subtype === 'plain' ? 'txt' : subtype) || 'text';
	}
	if (mime.startsWith('audio/')) return mime.slice('audio/'.length) || 'audio';
	if (mime.startsWith('video/')) return mime.slice('video/'.length) || 'video';
	if (mime === 'application/zip') return 'zip';
	if (mime === 'application/pdf') return 'pdf';
	return 'file';
}

/** 22 KB / 612 KB / 1.5 MB — matches the handoff's chip examples. */
export function formatAttachmentSize(bytes: number): string {
	if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
	const mb = bytes / (1024 * 1024);
	return `${mb >= 10 ? Math.round(mb) : Math.round(mb * 10) / 10} MB`;
}

/** Ready-to-send chips only: uploading and failed attachments stay local. */
export function outgoingAttachments(list: DraftAttachment[]): OutgoingAttachment[] {
	return list
		.filter((attachment) => attachment.status === 'ready' && attachment.blobId)
		.map((attachment) => ({
			blobId: attachment.blobId!,
			name: attachment.name,
			type: attachment.type,
			size: attachment.size
		}));
}

/** Rehydrate a chip from a server message's attachment part. */
export function attachmentFromServer(part: {
	blobId: string;
	name: string;
	type: string;
	size: number;
}): DraftAttachment {
	return {
		id: crypto.randomUUID(),
		name: part.name || 'attachment',
		type: part.type || 'application/octet-stream',
		size: part.size,
		blobId: part.blobId,
		status: 'ready'
	};
}
