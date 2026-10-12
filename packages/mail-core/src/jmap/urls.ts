/** Build JMAP blob upload URL from session template. */
export function buildUploadUrl(uploadUrl: string, accountId: string): string {
	if (uploadUrl.includes('{accountId}')) {
		return uploadUrl.replaceAll('{accountId}', encodeURIComponent(accountId));
	}

	const base = uploadUrl.endsWith('/') ? uploadUrl : `${uploadUrl}/`;
	return `${base}${encodeURIComponent(accountId)}`;
}

/** Build JMAP blob download URL from session template. */
export function buildDownloadUrl(
	downloadUrl: string,
	accountId: string,
	blobId: string,
	name: string,
	type: string
): string {
	if (downloadUrl.includes('{accountId}')) {
		const path = downloadUrl
			.replaceAll('{accountId}', encodeURIComponent(accountId))
			.replaceAll('{blobId}', encodeURIComponent(blobId))
			.replaceAll('{name}', encodeURIComponent(name));
		// RFC 8620 §6.2: the template names the type itself (Fastmail: `?type={type}`).
		if (path.includes('{type}')) return path.replaceAll('{type}', encodeURIComponent(type));
		const separator = path.includes('?') ? '&' : '?';
		return `${path}${separator}accept=${encodeURIComponent(type)}`;
	}

	const base = downloadUrl.endsWith('/') ? downloadUrl : `${downloadUrl}/`;
	return `${base}${encodeURIComponent(accountId)}/${encodeURIComponent(blobId)}/${encodeURIComponent(name)}?accept=${encodeURIComponent(type)}`;
}
