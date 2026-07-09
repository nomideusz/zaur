import { env } from '$env/dynamic/private';
import { checkRateLimitRow } from './store-db';
import { getStoreDb } from './store-instance';

export interface RateLimitOptions {
	key: string;
	limit: number;
	windowMs: number;
}

export interface RateLimitResult {
	allowed: boolean;
	retryAfterSec: number;
}

/**
 * Fixed-window rate limit backed by the server SQLite store, so counters
 * survive restarts and stay shared if more than one process serves traffic.
 */
export function checkRateLimit({ key, limit, windowMs }: RateLimitOptions): RateLimitResult {
	return checkRateLimitRow(getStoreDb(), key, limit, windowMs);
}

export function getClientAddress(request: Request): string {
	// Dokploy's Traefik APPENDS the real client IP as the last X-Forwarded-For entry,
	// so the trusted address is the Nth from the right (N = trusted proxy hops).
	// Taking [0] (leftmost) trusts a client-supplied value → rate-limit bypass.
	// zaur.app is 1 hop (Traefik). Set TRUSTED_PROXY_HOPS=2 if a CDN (e.g. Cloudflare) is fronted.
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
