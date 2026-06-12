import type { MessageAttachment } from '$lib/types/mail';

export type AttachmentPreviewKind = 'image' | 'video' | 'audio' | 'pdf' | 'text';

/** Text-ish types rendered as escaped plain text (HTML shown as source, never executed). */
const TEXT_TYPES = new Set([
	'text/plain',
	'text/csv',
	'text/markdown',
	'text/html',
	'text/css',
	'text/calendar',
	'application/json',
	'application/xml',
	'text/xml'
]);

/** Refuse to render huge text blobs inline — the download card handles those. */
export const MAX_TEXT_PREVIEW_BYTES = 1024 * 1024;

export function attachmentPreviewKind(
	attachment: Pick<MessageAttachment, 'name' | 'type' | 'size'>
): AttachmentPreviewKind | null {
	const type = (attachment.type || '').toLowerCase().split(';')[0].trim();

	if (type === 'application/pdf' || attachment.name.toLowerCase().endsWith('.pdf')) {
		return 'pdf';
	}
	if (type.startsWith('image/')) return 'image';
	if (type.startsWith('video/')) return 'video';
	if (type.startsWith('audio/')) return 'audio';
	if (TEXT_TYPES.has(type)) {
		return !attachment.size || attachment.size <= MAX_TEXT_PREVIEW_BYTES ? 'text' : null;
	}
	return null;
}

export function isPreviewable(
	attachment: Pick<MessageAttachment, 'name' | 'type' | 'size'>
): boolean {
	return attachmentPreviewKind(attachment) !== null;
}
