/**
 * AES-256-GCM seal/unseal over the SESSION_SECRET. Lives in its own module so both
 * the session store and the durable linked-accounts store can use it without a
 * circular import (`session.ts` → `linked-accounts.ts` → here, never back up).
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { env } from '$env/dynamic/private';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

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

export function sealSession(data: unknown, secret?: string): string {
	const key = getKey(requireSecret(secret ?? env.SESSION_SECRET));
	const iv = randomBytes(IV_LEN);
	const cipher = createCipheriv(ALGO, key, iv);
	const plaintext = JSON.stringify(data);
	const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
	const tag = cipher.getAuthTag();
	return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

export function unsealSession(token: string, secret?: string): unknown {
	try {
		const key = getKey(requireSecret(secret ?? env.SESSION_SECRET));
		const buf = Buffer.from(token, 'base64url');
		const iv = buf.subarray(0, IV_LEN);
		const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
		const encrypted = buf.subarray(IV_LEN + TAG_LEN);
		const decipher = createDecipheriv(ALGO, key, iv);
		decipher.setAuthTag(tag);
		const plaintext = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
		return JSON.parse(plaintext);
	} catch {
		return null;
	}
}
