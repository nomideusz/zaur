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
	const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
	const realIp = request.headers.get('x-real-ip')?.trim();
	return forwarded || realIp || 'unknown';
}
