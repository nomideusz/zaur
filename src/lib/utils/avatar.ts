import { md5Hex } from '$lib/utils/md5';

const DEFAULT_SIZE = 128;

async function sha256Hex(input: string): Promise<string> {
	const data = new TextEncoder().encode(input);
	const digest = await crypto.subtle.digest('SHA-256', data);
	return Array.from(new Uint8Array(digest))
		.map((byte) => byte.toString(16).padStart(2, '0'))
		.join('');
}

/** Ordered avatar URLs to try for an email address (most common providers first). */
export async function avatarUrlsForEmail(
	email: string | undefined | null,
	size = DEFAULT_SIZE
): Promise<string[]> {
	const normalized = email?.trim().toLowerCase();
	if (!normalized) return [];

	const md5 = md5Hex(normalized);
	const sha256 = await sha256Hex(normalized);
	const encoded = encodeURIComponent(normalized);
	const hashParams = `s=${size}&d=404`;

	return [
		// Gravatar (MD5 + SHA-256 — newer accounts may use either)
		`https://www.gravatar.com/avatar/${md5}?${hashParams}`,
		`https://www.gravatar.com/avatar/${sha256}?${hashParams}`,
		// Libravatar — federated open alternative, Gravatar-compatible hashes
		`https://seccdn.libravatar.org/avatar/${md5}?${hashParams}`,
		// Cravatar — widely used in China, Gravatar-compatible
		`https://cravatar.cn/avatar/${md5}?${hashParams}`,
		// V2EX mirror — another Gravatar-compatible CDN
		`https://cdn.v2ex.com/gravatar/${md5}?${hashParams}`,
		// GitHub public profile/commit email lookup (via Unavatar, last resort)
		`https://unavatar.io/github/${encoded}?fallback=false&s=${size}`
	];
}

/** @deprecated Use avatarUrlsForEmail — kept for single-provider callers. */
export function gravatarUrl(email: string | undefined | null, size = DEFAULT_SIZE): string | null {
	const normalized = email?.trim().toLowerCase();
	if (!normalized) return null;
	return `https://www.gravatar.com/avatar/${md5Hex(normalized)}?s=${size}&d=404`;
}
