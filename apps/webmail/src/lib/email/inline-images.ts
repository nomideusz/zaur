import type { JMAPBodyPart } from '$lib/jmap/types';

export type InlineImagePart = {
	blobId: string;
	name: string;
	type: string;
};

function normalizeCid(value: string): string {
	return value.replace(/^<|>$/g, '').trim().toLowerCase();
}

function inlineImageName(part: JMAPBodyPart): string {
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
		map.set(normalizeCid(cid), entry);
	}

	walk(bodyStructure);
	return map;
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

/** Rewrite `cid:` image sources to same-origin JMAP blob URLs (safe under default CSP). */
export function rewriteInlineCidImages(html: string, inlineImages: Map<string, InlineImagePart>): string {
	if (!html.trim() || inlineImages.size === 0) return html;

	return html.replace(
		/(<img\b[^>]*?\ssrc\s*=\s*(["']))cid:([^"']+)\2/gi,
		(match, prefix: string, quote: string, rawCid: string) => {
			const part = inlineImages.get(normalizeCid(rawCid));
			if (!part) return match;
			return `${prefix}${inlineImageDownloadUrl(part)}${quote}`;
		}
	);
}
