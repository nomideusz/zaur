/**
 * Images written into a message (rich compose) are shown from
 * /api/jmap/download while it is being written; on the wire they are inline
 * parts the HTML points at by `cid:`. The Content-ID is the blob id, as in
 * webmail 1.0, and mail2's reader resolves it back for a reopened draft.
 *
 * Trix's <figure> wrapper, with its JSON attributes and caption markup, is
 * editor furniture: each image goes out as a plain <img> on its own line, as
 * the editor showed it, plus the caption when one was written. The width is capped for Outlook, which ignores
 * max-width. An image that has not finished uploading is not there yet, so it
 * is dropped (compose will not send while one is pending).
 */
import type { EmailAttachmentInput } from '@zaur/mail-core';

const MAX_WIDTH = 600;
const MAX_IMAGES = 30;
const SRC = /^\/api\/jmap\/download\?/;

const attr = (tag: string, name: string) => new RegExp(`\\s${name}="([^"]*)"`, 'i').exec(tag)?.[1];
const unescape = (value: string) => value.replaceAll('&amp;', '&');
const escape = (value: string) =>
	value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

export function inlineImages(html: string): { html: string; parts: EmailAttachmentInput[] } {
	const parts = new Map<string, EmailAttachmentInput>();

	const image = (tag: string): string => {
		const src = unescape(attr(tag, 'src') ?? '');
		if (!SRC.test(src)) return '';
		const params = new URLSearchParams(src.split('?')[1]);
		const blobId = params.get('blobId');
		const type = params.get('type') ?? '';
		if (!blobId || !type.startsWith('image/')) return '';
		const name = params.get('name') || 'image';
		if (!parts.has(blobId)) {
			if (parts.size >= MAX_IMAGES) return '';
			parts.set(blobId, { blobId, name, type, size: 0, cid: blobId, disposition: 'inline' });
		}
		const width = Number(attr(tag, 'width')) || 0;
		const height = Number(attr(tag, 'height')) || 0;
		const scale = width > MAX_WIDTH ? MAX_WIDTH / width : 1;
		const size = width
			? ` width="${Math.round(width * scale)}"${height ? ` height="${Math.round(height * scale)}"` : ''}`
			: '';
		return `<img src="cid:${escape(blobId)}" alt="${escape(name)}"${size} style="max-width:100%;height:auto">`;
	};

	const out = html
		.replace(/<figure\b[^>]*>([\s\S]*?)<\/figure>/gi, (_, inner: string) => {
			const img = /<img\b[^>]*>/i.exec(inner)?.[0];
			const shown = img ? image(img) : '';
			const caption = /<figcaption\b[^>]*attachment__caption--edited[^>]*>([\s\S]*?)<\/figcaption>/i.exec(inner)?.[1];
			return shown && `<div>${shown}${caption ? `<br>${caption}` : ''}</div>`;
		})
		// Outside a figure (HTML that never went through the editor): same treatment.
		.replace(/<img\b[^>]*\ssrc="\/api\/jmap\/download\?[^"]*"[^>]*>/gi, image);

	return { html: out, parts: [...parts.values()] };
}
