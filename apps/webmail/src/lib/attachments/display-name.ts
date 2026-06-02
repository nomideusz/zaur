const UUID_FILENAME =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\.[a-z0-9]+)?$/i;
const OPAQUE_FILENAME = /^[0-9A-F-]{20,}(\.[a-z0-9]+)?$/i;

function fileExtension(name: string): string {
	const index = name.lastIndexOf('.');
	if (index <= 0 || index === name.length - 1) return '';
	return name.slice(index);
}

function kindLabel(type: string, extension: string): string {
	if (type.startsWith('image/')) return `Image${extension}`;
	if (type.startsWith('video/')) return `Video${extension}`;
	if (type.startsWith('audio/')) return `Audio${extension}`;
	if (type === 'application/pdf') return `PDF${extension}`;
	if (type.includes('spreadsheet') || extension === '.xlsx' || extension === '.csv') {
		return `Spreadsheet${extension}`;
	}
	if (type.includes('presentation') || extension === '.pptx') return `Presentation${extension}`;
	if (type.includes('word') || extension === '.docx' || extension === '.doc') {
		return `Document${extension}`;
	}
	if (extension) return `File${extension}`;
	return 'File';
}

export function attachmentDisplayName(name: string, type: string): string {
	const trimmed = name.trim() || 'attachment';
	if (UUID_FILENAME.test(trimmed) || OPAQUE_FILENAME.test(trimmed)) {
		return kindLabel(type, fileExtension(trimmed));
	}
	if (trimmed.length > 52) {
		const extension = fileExtension(trimmed);
		const stem = extension ? trimmed.slice(0, -extension.length) : trimmed;
		const keep = Math.max(8, 52 - extension.length - 1);
		return `${stem.slice(0, keep)}…${extension}`;
	}
	return trimmed;
}

export function attachmentIsOpaqueName(name: string): boolean {
	const trimmed = name.trim();
	return UUID_FILENAME.test(trimmed) || OPAQUE_FILENAME.test(trimmed);
}
