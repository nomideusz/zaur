import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export interface SessionData {
	serverUrl: string;
	username: string;
	password: string;
}

const COOKIE_NAME = 'zaur_session';
const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;
/** Persistent session when the user chooses “Remember me”. */
export const REMEMBERED_SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 days

function getKey(secret: string): Buffer {
	return createHash('sha256').update(secret).digest();
}

function requireSecret(secret: string | undefined): string {
	if (secret?.trim()) return secret.trim();
	if (process.env.NODE_ENV === 'production') {
		throw new Error('SESSION_SECRET must be set in production');
	}
	return 'dev-insecure-session-secret-change-me';
}

export function sealSession(data: SessionData, secret?: string): string {
	const key = getKey(requireSecret(secret ?? env.SESSION_SECRET));
	const iv = randomBytes(IV_LEN);
	const cipher = createCipheriv(ALGO, key, iv);
	const plaintext = JSON.stringify(data);
	const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
	const tag = cipher.getAuthTag();
	return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

export function unsealSession(token: string, secret?: string): SessionData | null {
	try {
		const key = getKey(requireSecret(secret ?? env.SESSION_SECRET));
		const buf = Buffer.from(token, 'base64url');
		const iv = buf.subarray(0, IV_LEN);
		const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
		const encrypted = buf.subarray(IV_LEN + TAG_LEN);
		const decipher = createDecipheriv(ALGO, key, iv);
		decipher.setAuthTag(tag);
		const plaintext = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
		return JSON.parse(plaintext) as SessionData;
	} catch {
		return null;
	}
}

export function readSession(cookies: Cookies, secret?: string): SessionData | null {
	const token = cookies.get(COOKIE_NAME);
	if (!token) return null;
	return unsealSession(token, secret);
}

export function writeSession(
	cookies: Cookies,
	data: SessionData,
	options?: { remember?: boolean; secret?: string }
): void {
	const cookieOptions: Parameters<Cookies['set']>[2] = {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production'
	};

	if (options?.remember) {
		cookieOptions.maxAge = REMEMBERED_SESSION_MAX_AGE_SEC;
	}

	cookies.set(COOKIE_NAME, sealSession(data, options?.secret), cookieOptions);
}

export function clearSession(cookies: Cookies): void {
	cookies.delete(COOKIE_NAME, { path: '/' });
}
