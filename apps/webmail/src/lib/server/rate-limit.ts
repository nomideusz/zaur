import { env } from '$env/dynamic/private';

type Bucket = {
	count: number;
	resetAt: number;
};

const buckets = new Map<string, Bucket>();

export interface RateLimitOptions {
	key: string;
	limit: number;
	windowMs: number;
}

export interface RateLimitResult {
	allowed: boolean;
	retryAfterSec: number;
}

export function checkRateLimit({ key, limit, windowMs }: RateLimitOptions): RateLimitResult {
	const now = Date.now();
	const existing = buckets.get(key);

	if (!existing || now >= existing.resetAt) {
		buckets.set(key, { count: 1, resetAt: now + windowMs });
		return { allowed: true, retryAfterSec: 0 };
	}

	if (existing.count >= limit) {
		return {
			allowed: false,
			retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000))
		};
	}

	existing.count += 1;
	buckets.set(key, existing);
	return { allowed: true, retryAfterSec: 0 };
}

export function getClientAddress(request: Request): string {
	// CapRover's nginx APPENDS the real client IP as the last X-Forwarded-For entry,
	// so the trusted address is the Nth from the right (N = trusted proxy hops).
	// Taking [0] (leftmost) trusts a client-supplied value → rate-limit bypass.
	// zaur.app is 1 hop (nginx). Set TRUSTED_PROXY_HOPS=2 if a CDN (e.g. Cloudflare) is fronted.
	const hops = Math.max(1, Number(env.TRUSTED_PROXY_HOPS) || 1);
	const chain = request.headers
		.get('x-forwarded-for')
		?.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
	if (chain?.length) {
		return chain[Math.max(0, chain.length - hops)];
	}
	return request.headers.get('x-real-ip')?.trim() || 'unknown';
}
