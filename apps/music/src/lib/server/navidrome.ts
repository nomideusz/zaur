/**
 * Navidrome is the library; this app is its face. Every Zaur address gets its
 * own Navidrome user (favourites, playlists, play counts are per person),
 * created on first use by our admin account. The user's password is derived
 * from the address with NAVIDROME_USER_KEY, so nothing per user is stored here.
 */
import { createHash, createHmac, randomBytes } from 'node:crypto';
import { error } from '@sveltejs/kit';
import type { User } from '#lib/types';

type Params = Record<string, string | number | boolean | undefined>;

const base = () => (process.env.NAVIDROME_URL?.trim() || 'http://navidrome:4533').replace(/\/$/, '');
const adminUser = () => process.env.NAVIDROME_ADMIN_USER?.trim() || 'zaur-music';
const adminPassword = () => process.env.NAVIDROME_ADMIN_PASSWORD?.trim() ?? '';

function passwordFor(email: string): string {
	const key = process.env.NAVIDROME_USER_KEY?.trim();
	if (!key) throw new Error('NAVIDROME_USER_KEY is not set');
	return createHmac('sha256', key).update(email).digest('base64url');
}

export class SubsonicError extends Error {
	constructor(
		readonly code: number,
		message: string
	) {
		super(message);
	}
}

/** A /rest URL with token auth for this username/password. */
function restUrl(username: string, password: string, method: string, params: Params = {}): string {
	const salt = randomBytes(8).toString('hex');
	const query = new URLSearchParams({
		u: username,
		t: createHash('md5').update(password + salt).digest('hex'),
		s: salt,
		v: '1.16.1',
		c: 'zaur-music',
		f: 'json'
	});
	for (const [key, value] of Object.entries(params)) if (value !== undefined) query.set(key, String(value));
	return `${base()}/rest/${method}?${query}`;
}

async function call<T>(url: string): Promise<T> {
	const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
	const body = (await response.json().catch(() => null)) as { 'subsonic-response'?: Record<string, unknown> } | null;
	const reply = body?.['subsonic-response'];
	if (!reply) throw new Error(`Navidrome answered ${response.status}`);
	if (reply.status !== 'ok') {
		const error = reply.error as { code?: number; message?: string } | undefined;
		throw new SubsonicError(error?.code ?? 0, error?.message ?? 'Navidrome error');
	}
	return reply as T;
}

async function asUser<T>(user: User, method: string, params: Params): Promise<T> {
	try {
		return await call<T>(restUrl(user.email, passwordFor(user.email), method, params));
	} catch (cause) {
		// 40: wrong username or password — no such user yet.
		if (!(cause instanceof SubsonicError) || cause.code !== 40) throw cause;
		await ensureUser(user);
		return call<T>(restUrl(user.email, passwordFor(user.email), method, params));
	}
}

/**
 * Subsonic as the signed-in person; their Navidrome user is made on first use.
 * What goes wrong becomes a page the person can read: not found, or a library
 * that is not answering (down, slow, misconfigured — the log has which).
 */
export async function sub<T = Record<string, never>>(user: User, method: string, params: Params = {}): Promise<T> {
	try {
		return await asUser<T>(user, method, params);
	} catch (cause) {
		// 70: the requested data was not found.
		if (cause instanceof SubsonicError && cause.code === 70) error(404, 'That is not in the library.');
		console.error(`[navidrome] ${method} failed`, cause);
		error(502, 'The music library is not answering.');
	}
}

/** Subsonic as our admin account (library scans). */
export const adminSub = <T = Record<string, never>>(method: string, params: Params = {}) =>
	call<T>(restUrl(adminUser(), adminPassword(), method, params));

/** For binary answers (stream, cover art) the caller pipes through itself. */
export const userRestUrl = (user: User, method: string, params: Params) =>
	restUrl(user.email, passwordFor(user.email), method, params);

let admin: { at: number; token: string } | undefined;
async function adminToken(): Promise<string> {
	if (admin && Date.now() - admin.at < 3600_000) return admin.token;
	const response = await fetch(`${base()}/auth/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ username: adminUser(), password: adminPassword() })
	});
	const { token } = (await response.json().catch(() => ({}))) as { token?: string };
	if (!response.ok || !token) throw new Error(`Navidrome admin login failed (${response.status})`);
	admin = { at: Date.now(), token };
	return token;
}

async function nativeApi(path: string, method: string, body?: unknown): Promise<Response> {
	return fetch(`${base()}/api/${path}`, {
		method,
		headers: { 'Content-Type': 'application/json', 'X-ND-Authorization': `Bearer ${await adminToken()}` },
		body: body === undefined ? undefined : JSON.stringify(body)
	});
}

// One creation per address at a time: a page load fires several calls at once.
const pending = new Map<string, Promise<void>>();

function ensureUser(user: User): Promise<void> {
	let job = pending.get(user.email);
	if (!job) {
		job = createOrReset(user).finally(() => pending.delete(user.email));
		pending.set(user.email, job);
	}
	return job;
}

async function createOrReset(user: User): Promise<void> {
	const password = passwordFor(user.email);
	const created = await nativeApi('user', 'POST', {
		userName: user.email,
		name: user.name,
		email: user.email,
		password,
		isAdmin: false
	});
	if (created.ok) return;
	// Already there (made by hand, or the key changed): give it the derived password.
	const users = (await (await nativeApi('user', 'GET')).json()) as { id: string; userName: string }[];
	const existing = users.find((u) => u.userName.toLowerCase() === user.email);
	if (!existing) throw new Error(`Could not create the Navidrome user (${created.status})`);
	const updated = await nativeApi(`user/${existing.id}`, 'PUT', { ...existing, password });
	if (!updated.ok) throw new Error(`Could not reset the Navidrome user (${updated.status})`);
}
