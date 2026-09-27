import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import type { User } from '#lib/types';

const COOKIE = 'zaur_music';
// A week, then a silent trip through mail's sign-in (no prompt while mail's session lives).
const MAX_AGE_S = 7 * 24 * 3600;

function secret(): string {
	const value = process.env.SESSION_SECRET?.trim();
	if (value) return value;
	if (process.env.NODE_ENV === 'production') throw new Error('SESSION_SECRET is not set');
	return 'zaur-music-dev-secret';
}

const mac = (body: string) => createHmac('sha256', secret()).update(body).digest();

/** JSON in a signed (not encrypted) cookie value: nothing secret goes in here. */
export function seal(value: unknown): string {
	const body = Buffer.from(JSON.stringify(value)).toString('base64url');
	return `${body}.${mac(body).toString('base64url')}`;
}

export function unseal<T>(token: string | undefined): T | null {
	const [body, signature] = token?.split('.') ?? [];
	if (!body || !signature) return null;
	const given = Buffer.from(signature, 'base64url');
	const expected = mac(body);
	if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
	try {
		return JSON.parse(Buffer.from(body, 'base64url').toString()) as T;
	} catch {
		return null;
	}
}

export function readUser(cookies: Cookies): User | null {
	const value = unseal<User & { exp: number }>(cookies.get(COOKIE));
	if (!value || value.exp < Date.now()) return null;
	return { email: value.email, name: value.name };
}

export function writeUser(cookies: Cookies, user: User, secure: boolean): void {
	cookies.set(COOKIE, seal({ ...user, exp: Date.now() + MAX_AGE_S * 1000 }), {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure,
		maxAge: MAX_AGE_S
	});
}

export function clearUser(cookies: Cookies): void {
	cookies.delete(COOKIE, { path: '/' });
}
