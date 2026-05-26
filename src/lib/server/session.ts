import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Cookies } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export interface SessionData {
	serverUrl: string;
	username: string;
	password: string;
}

export const COOKIE_NAME = 'zaur_session';
const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;
/** Persistent session when the user chooses “Remember me”. */
export const REMEMBERED_SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 days
const SESSION_RECORD_MAX_AGE_MS = REMEMBERED_SESSION_MAX_AGE_SEC * 1000;
const DEFAULT_SESSION_STORE_PATH = path.join(process.cwd(), '.data', 'sessions.json');

interface StoredSessionRecord {
	id: string;
	username: string;
	sealedData: string;
	createdAt: string;
	updatedAt: string;
	expiresAt?: string;
}

type SessionStore = Record<string, StoredSessionRecord>;

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

function getSessionStorePath(): string {
	return env.SESSION_STORE_PATH?.trim() || DEFAULT_SESSION_STORE_PATH;
}

function readSessionStore(): SessionStore {
	try {
		const raw = readFileSync(getSessionStorePath(), 'utf8');
		const parsed = JSON.parse(raw) as SessionStore;
		return parsed && typeof parsed === 'object' ? parsed : {};
	} catch {
		return {};
	}
}

function writeSessionStore(store: SessionStore): void {
	const storePath = getSessionStorePath();
	mkdirSync(path.dirname(storePath), { recursive: true });
	writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf8');
}

function isExpired(record: StoredSessionRecord, now = Date.now()): boolean {
	const expiresAt = record.expiresAt ? Date.parse(record.expiresAt) : NaN;
	if (Number.isFinite(expiresAt) && now > expiresAt) return true;

	const updatedAt = Date.parse(record.updatedAt || record.createdAt);
	if (!Number.isFinite(updatedAt)) return true;
	return now - updatedAt > SESSION_RECORD_MAX_AGE_MS;
}

function pruneExpiredSessions(store: SessionStore): boolean {
	const now = Date.now();
	let pruned = false;
	for (const [id, record] of Object.entries(store)) {
		if (isExpired(record, now)) {
			delete store[id];
			pruned = true;
		}
	}
	return pruned;
}

function createSessionRecord(data: SessionData, options?: { remember?: boolean; secret?: string }): string {
	const store = readSessionStore();
	pruneExpiredSessions(store);

	const id = randomBytes(32).toString('base64url');
	const now = new Date();
	const record: StoredSessionRecord = {
		id,
		username: data.username,
		sealedData: sealSession(data, options?.secret),
		createdAt: now.toISOString(),
		updatedAt: now.toISOString(),
		...(options?.remember
			? { expiresAt: new Date(now.getTime() + SESSION_RECORD_MAX_AGE_MS).toISOString() }
			: {})
	};

	store[id] = record;
	writeSessionStore(store);
	return id;
}

export function readSessionById(id: string | undefined, secret?: string): SessionData | null {
	if (!id) return null;

	const store = readSessionStore();
	const record = store[id];
	if (!record) return null;

	if (isExpired(record)) {
		delete store[id];
		writeSessionStore(store);
		return null;
	}

	const data = unsealSession(record.sealedData, secret);
	if (!data) {
		delete store[id];
		writeSessionStore(store);
		return null;
	}

	record.updatedAt = new Date().toISOString();
	store[id] = record;
	writeSessionStore(store);
	return data;
}

function removeSessionRecord(id: string | undefined): void {
	if (!id) return;
	const store = readSessionStore();
	if (!store[id]) return;
	delete store[id];
	writeSessionStore(store);
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
	return readSessionById(token, secret);
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

	cookies.set(COOKIE_NAME, createSessionRecord(data, options), cookieOptions);
}

export function clearSession(cookies: Cookies): void {
	removeSessionRecord(cookies.get(COOKIE_NAME));
	cookies.delete(COOKIE_NAME, { path: '/' });
}
