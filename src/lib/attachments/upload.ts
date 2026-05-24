const MAX_BYTES = 25 * 1024 * 1024;

export function validateAttachmentFile(file: File, currentCount: number): string | null {
	if (currentCount >= 10) return 'You can attach up to 10 files';
	if (file.size > MAX_BYTES) return `"${file.name}" is too large (max 25 MB)`;
	if (!file.size) return `"${file.name}" is empty`;
	return null;
}

export function formatAttachmentSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
