/** Raster types the download proxy will serve with `Content-Disposition: inline`. */
const IMAGE_TYPES = new Set([
	'image/png',
	'image/jpeg',
	'image/jpg',
	'image/gif',
	'image/webp',
	'image/avif',
	'image/bmp',
	'image/x-icon',
	'image/vnd.microsoft.icon'
]);

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif|bmp|ico)$/i;

const EXT_TO_TYPE: Record<string, string> = {
	png: 'image/png',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	gif: 'image/gif',
	webp: 'image/webp',
	avif: 'image/avif',
	bmp: 'image/bmp',
	ico: 'image/x-icon'
};

function mimeType(file: { type?: string | null }): string {
	return (file.type || '').toLowerCase().split(';')[0].trim();
}

function extensionType(name: string): string | null {
	const ext = name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
	return ext ? (EXT_TO_TYPE[ext] ?? null) : null;
}

export function isImageFile(file: { name: string; type?: string | null; nodeType?: string }): boolean {
	if (file.nodeType && file.nodeType !== 'file') return false;
	const type = mimeType(file);
	if (IMAGE_TYPES.has(type)) return true;
	return IMAGE_EXT.test(file.name);
}

/** MIME type to request so `/api/jmap/download?inline=1` actually renders. */
export function imagePreviewType(file: { name: string; type?: string | null }): string | null {
	const type = mimeType(file);
	if (type === 'image/jpg' || type === 'image/vnd.microsoft.icon') {
		return type === 'image/jpg' ? 'image/jpeg' : 'image/x-icon';
	}
	if (IMAGE_TYPES.has(type)) return type;
	return extensionType(file.name);
}

export function fileInlineImageUrl(file: {
	blobId: string | null;
	name: string;
	type?: string | null;
}): string | null {
	if (!file.blobId) return null;
	const type = imagePreviewType(file);
	if (!type) return null;
	const params = new URLSearchParams({
		blobId: file.blobId,
		name: file.name,
		type,
		inline: '1'
	});
	return `/api/jmap/download?${params.toString()}`;
}

export function imageNearPage(index: number, page: number, count: number): boolean {
	if (Math.abs(index - page) <= 1) return true;
	if (count < 2) return false;
	if (page === 0 && index === count - 1) return true;
	if (page === count - 1 && index === 0) return true;
	return false;
}
