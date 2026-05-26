import { avatarUrlsForEmail } from '$lib/utils/avatar';
import type { RequestHandler } from './$types';

const HIT_TTL_MS = 24 * 60 * 60 * 1000;
const MISS_TTL_MS = 60 * 60 * 1000;
const MAX_AVATAR_BYTES = 1024 * 1024;

interface CachedAvatarResponse {
	status: 200 | 404;
	body?: ArrayBuffer;
	contentType?: string;
	expiresAt: number;
}

const cache = new Map<string, CachedAvatarResponse>();

function normalizeSize(value: string | null): number {
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) return 128;
	return Math.max(32, Math.min(256, Math.floor(parsed)));
}

function cacheKey(email: string, size: number): string {
	return `${email}:${size}`;
}

function cachedResponse(record: CachedAvatarResponse): Response {
	if (record.status === 404 || !record.body) {
		return new Response(null, {
			status: 404,
			headers: {
				'Cache-Control': 'private, max-age=3600'
			}
		});
	}

	return new Response(record.body.slice(0), {
		status: 200,
		headers: {
			'Content-Type': record.contentType ?? 'image/jpeg',
			'Cache-Control': 'private, max-age=86400'
		}
	});
}

async function fetchAvatar(url: string): Promise<{ body: ArrayBuffer; contentType: string } | null> {
	const response = await fetch(url, {
		redirect: 'follow',
		headers: {
			Accept: 'image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8'
		}
	});

	if (!response.ok || !response.body) return null;
	const contentType = response.headers.get('content-type') ?? '';
	if (!contentType.startsWith('image/')) return null;

	const length = Number(response.headers.get('content-length'));
	if (Number.isFinite(length) && length > MAX_AVATAR_BYTES) return null;

	const body = await response.arrayBuffer();
	if (body.byteLength > MAX_AVATAR_BYTES) return null;
	return { body, contentType };
}

export const GET: RequestHandler = async ({ url }) => {
	const email = url.searchParams.get('email')?.trim().toLowerCase();
	if (!email) {
		return new Response(null, { status: 400 });
	}

	const size = normalizeSize(url.searchParams.get('size'));
	const key = cacheKey(email, size);
	const existing = cache.get(key);
	if (existing && Date.now() <= existing.expiresAt) {
		return cachedResponse(existing);
	}
	if (existing) cache.delete(key);

	const providers = await avatarUrlsForEmail(email, size);
	for (const provider of providers) {
		try {
			const avatar = await fetchAvatar(provider);
			if (!avatar) continue;
			const record: CachedAvatarResponse = {
				status: 200,
				body: avatar.body,
				contentType: avatar.contentType,
				expiresAt: Date.now() + HIT_TTL_MS
			};
			cache.set(key, record);
			return cachedResponse(record);
		} catch {
			// Try the next provider; avatar lookup is best-effort.
		}
	}

	const miss: CachedAvatarResponse = { status: 404, expiresAt: Date.now() + MISS_TTL_MS };
	cache.set(key, miss);
	return cachedResponse(miss);
};
