import { createHash } from 'node:crypto';

export function sha256Base64Url(value: string): string {
	return createHash('sha256').update(value).digest('base64url');
}

export function createPkceChallenge(verifier: string): string {
	return sha256Base64Url(verifier);
}

export function sanitizeLocalRedirect(value: string | null | undefined): string | undefined {
	if (!value?.startsWith('/') || value.startsWith('//')) return undefined;
	try {
		const base = new URL('https://webmail.invalid');
		const resolved = new URL(value, base);
		if (resolved.origin !== base.origin) return undefined;
		return `${resolved.pathname}${resolved.search}${resolved.hash}`;
	} catch {
		return undefined;
	}
}
