import type { JMAPBodyPart } from '../jmap/types';

export type InlineImagePart = {
	blobId: string;
	name: string;
	type: string;
};

function normalizeCid(value: string): string {
	return value.replace(/^<|>$/g, '').trim().toLowerCase();
}

function registerInlineImage(
	map: Map<string, InlineImagePart>,
	entry: InlineImagePart,
	...keys: Array<string | undefined>
): void {
	for (const key of keys) {
		if (!key?.trim()) continue;
		map.set(normalizeCid(key), entry);
	}
}

export function inlineImageName(part: JMAPBodyPart): string {
	if (part.name?.trim()) return part.name.trim();
	const ext = part.type?.split('/')[1]?.split(';')[0]?.trim();
	return ext ? `inline.${ext}` : 'inline.bin';
}

/** Map Content-ID values to JMAP blob parts for inline HTML images. */
export function extractInlineImages(bodyStructure?: JMAPBodyPart): Map<string, InlineImagePart> {
	const map = new Map<string, InlineImagePart>();
	if (!bodyStructure) return map;

	function walk(part: JMAPBodyPart) {
		if (part.subParts?.length) {
			for (const sub of part.subParts) walk(sub);
		}

		const cid = part.cid?.trim();
		if (!cid || !part.blobId || !part.type?.startsWith('image/')) return;

		const entry: InlineImagePart = {
			blobId: part.blobId,
			name: inlineImageName(part),
			type: part.type
		};
		registerInlineImage(map, entry, cid, part.blobId);
	}

	walk(bodyStructure);
	return map;
}

export type InlineAttachmentSource = {
	blobId: string;
	name: string;
	type: string;
	cid?: string;
	disposition?: string;
};

/** Build a cid lookup map from compose/outbox attachment metadata. */
export function buildInlineImageMapFromAttachments(
	attachments: InlineAttachmentSource[]
): Map<string, InlineImagePart> {
	const map = new Map<string, InlineImagePart>();
	for (const attachment of attachments) {
		if (!attachment.blobId || !attachment.type.startsWith('image/')) continue;
		const entry: InlineImagePart = {
			blobId: attachment.blobId,
			name: attachment.name.trim() || inlineImageName({ type: attachment.type }),
			type: attachment.type
		};
		registerInlineImage(map, entry, attachment.cid, attachment.blobId);
	}
	return map;
}

function inlinePartFromCidFallback(rawCid: string): InlineImagePart | undefined {
	const cid = rawCid.replace(/^<|>$/g, '').trim();
	if (!cid) return undefined;
	// Compose stores JMAP blob IDs directly as Content-IDs.
	if (/^[a-z0-9]{16,}$/i.test(cid)) {
		return { blobId: cid, name: 'inline.png', type: 'image/png' };
	}
	return undefined;
}

export function extractInlineCidsFromHtml(html: string): string[] {
	if (!html.trim()) return [];
	const cids = new Set<string>();
	const pattern = /\bsrc\s*=\s*(["'])cid:([^"']+)\1/gi;
	for (const match of html.matchAll(pattern)) {
		const cid = match[2]?.replace(/^<|>$/g, '').trim();
		if (cid) cids.add(cid);
	}
	return [...cids];
}

export function inlineImageDownloadUrl(part: InlineImagePart): string {
	const params = new URLSearchParams({
		blobId: part.blobId,
		name: part.name,
		type: part.type,
		inline: '1'
	});
	return `/api/jmap/download?${params.toString()}`;
}

/** Rewrite same-origin download URLs back to `cid:` for outbound HTML. */
export function rewriteInlineDownloadUrlsToCid(
	html: string,
	attachments: Array<{ blobId: string; cid?: string }>
): string {
	if (!html.trim() || !attachments.length) return html;

	const cidByBlobId = new Map(
		attachments.map((attachment) => [attachment.blobId, attachment.cid?.trim() || attachment.blobId])
	);

	return html.replace(
		/(<img\b[^>]*?\ssrc\s*=\s*(["']))(\/api\/jmap\/download\?[^"']+)(\2)/gi,
		(match, prefix: string, quote: string, url: string) => {
			try {
				const blobId = new URL(url, 'https://webmail.local').searchParams.get('blobId');
				if (!blobId) return match;
				const cid = cidByBlobId.get(blobId);
				if (!cid) return match;
				return `${prefix}cid:${cid}${quote}`;
			} catch {
				return match;
			}
		}
	);
}

/** Rewrite `cid:` image sources to same-origin JMAP blob URLs (safe under default CSP). */
export function rewriteInlineCidImages(html: string, inlineImages: Map<string, InlineImagePart>): string {
	if (!html.trim()) return html;

	return html.replace(
		/(<img\b[^>]*?\ssrc\s*=\s*(["']))cid:([^"']+)\2/gi,
		(match, prefix: string, quote: string, rawCid: string) => {
			const part = inlineImages.get(normalizeCid(rawCid)) ?? inlinePartFromCidFallback(rawCid);
			if (!part) return match;
			return `${prefix}${inlineImageDownloadUrl(part)}${quote}`;
		}
	);
}

/** Prefer download URLs in editors/readers; keep `cid:` in stored/sent HTML. */
export function inlineHtmlForDisplay(
	html: string,
	attachments: InlineAttachmentSource[] = []
): string {
	const map = buildInlineImageMapFromAttachments(attachments);
	for (const cid of extractInlineCidsFromHtml(html)) {
		const fallback = inlinePartFromCidFallback(cid);
		if (fallback) registerInlineImage(map, fallback, cid);
	}
	return rewriteInlineCidImages(html, map);
}

export function inlineHtmlForStorage(
	html: string,
	attachments: Array<{ blobId: string; cid?: string }> = []
): string {
	return rewriteInlineDownloadUrlsToCid(html, attachments);
}
