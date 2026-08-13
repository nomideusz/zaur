function normalizeBaseUrl(raw: string | null | undefined): string {
	const trimmed = raw?.trim() ?? '';
	if (!trimmed) return '';
	const withProtocol = trimmed.includes('://') ? trimmed : `https://${trimmed}`;
	return withProtocol.replace(/\/+$/, '');
}

/** Invite tokens last a working day so calendar guests can join late. */
export const GALENE_TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

/** Galene stores token permissions as an internal list — `"op"` does not expand. */
const OPERATOR_PERMISSIONS = ['op', 'present', 'message', 'caption', 'token'];
const PRESENTER_PERMISSIONS = ['present', 'message'];

export type GaleneConfig = {
	baseUrl: string;
	adminUser: string;
	adminPassword: string;
};

export class GaleneError extends Error {
	status: number;
	constructor(message: string, status: number) {
		super(message);
		this.name = 'GaleneError';
		this.status = status;
	}
}

export function galeneConfigFromEnv(
	privateEnv: Record<string, string | undefined>,
	pubEnv: Record<string, string | undefined>
): GaleneConfig | null {
	const baseUrl = normalizeBaseUrl(pubEnv.PUBLIC_GALENE_URL || pubEnv.PUBLIC_JITSI_URL);
	const adminUser = privateEnv.GALENE_ADMIN_USER?.trim() || 'admin';
	const adminPassword = privateEnv.GALENE_ADMIN_PASSWORD?.trim() ?? '';
	if (!baseUrl || !adminPassword) return null;
	return { baseUrl, adminUser, adminPassword };
}

function basicAuth(user: string, password: string): string {
	return `Basic ${Buffer.from(`${user}:${password}`, 'utf8').toString('base64')}`;
}

function apiHeaders(config: GaleneConfig, extra?: Record<string, string>): Record<string, string> {
	return {
		Authorization: basicAuth(config.adminUser, config.adminPassword),
		Accept: 'application/json',
		...extra
	};
}

async function readError(res: Response): Promise<string> {
	const text = (await res.text().catch(() => '')).trim();
	return text.slice(0, 200) || res.statusText || 'Galene request failed';
}

function groupApiUrl(config: GaleneConfig, group: string): string {
	return `${config.baseUrl}/galene-api/v0/.groups/${encodeURIComponent(group)}`;
}

function jsonHeaders(config: GaleneConfig, extra?: Record<string, string>): Record<string, string> {
	return apiHeaders(config, { 'Content-Type': 'application/json', ...extra });
}

/** Location is either the raw token or a path ending in the token. */
export function tokenFromLocation(location: string): string {
	const trimmed = location.trim();
	if (!trimmed) return '';
	const path = trimmed.includes('://')
		? (() => {
				try {
					return new URL(trimmed).pathname;
				} catch {
					return trimmed;
				}
			})()
		: trimmed;
	const last = path.split('/').filter(Boolean).pop() ?? '';
	if (!last || last.startsWith('.')) return '';
	return last;
}

/**
 * Anyone with the room URL can join under any name. The unguessable group id
 * is the access control; a failed invite token must not trap the client.
 */
async function ensureOpenJoin(
	config: GaleneConfig,
	group: string,
	fetchFn: typeof fetch
): Promise<void> {
	const userUrl = `${groupApiUrl(config, group)}/.wildcard-user`;
	const get = await fetchFn(userUrl, { headers: apiHeaders(config) });
	const etag = get.ok ? get.headers.get('etag')?.trim() : undefined;
	if (get.ok) await get.text().catch(() => undefined);
	const putUser = await fetchFn(userUrl, {
		method: 'PUT',
		headers: jsonHeaders(config, etag ? { 'If-Match': etag } : {}),
		body: JSON.stringify({ permissions: 'present' })
	});
	if (!putUser.ok && putUser.status !== 204 && putUser.status !== 201 && putUser.status !== 412) {
		throw new GaleneError(await readError(putUser), putUser.status);
	}

	const putPassword = await fetchFn(`${userUrl}/.password`, {
		method: 'PUT',
		headers: jsonHeaders(config),
		body: JSON.stringify({ type: 'wildcard' })
	});
	if (!putPassword.ok && putPassword.status !== 204 && putPassword.status !== 201) {
		throw new GaleneError(await readError(putPassword), putPassword.status);
	}
}

/**
 * Drop authPortal from existing rooms. Galene strips `?token=` from the
 * address bar; with authPortal set, a refresh bounces back to webmail
 * instead of showing the name prompt.
 */
async function stripAuthPortal(
	config: GaleneConfig,
	group: string,
	fetchFn: typeof fetch
): Promise<void> {
	const url = groupApiUrl(config, group);
	const get = await fetchFn(url, { headers: apiHeaders(config) });
	if (!get.ok) return;
	const etag = get.headers.get('etag')?.trim();
	let desc: Record<string, unknown> = {};
	try {
		desc = JSON.parse(await get.text()) as Record<string, unknown>;
	} catch {
		return;
	}
	if (!('authPortal' in desc) && desc['unrestricted-tokens'] === true) return;
	delete desc.authPortal;
	delete desc.users;
	delete desc['wildcard-user'];
	delete desc.authKeys;
	desc['unrestricted-tokens'] = true;
	const put = await fetchFn(url, {
		method: 'PUT',
		headers: jsonHeaders(config, etag ? { 'If-Match': etag } : {}),
		body: JSON.stringify(desc)
	});
	if (!put.ok && put.status !== 204 && put.status !== 201 && put.status !== 412) {
		throw new GaleneError(await readError(put), put.status);
	}
}

/** PUT the group if it does not exist yet (If-None-Match: *). */
export async function ensureGroup(
	config: GaleneConfig,
	group: string,
	fetchFn: typeof fetch = fetch
): Promise<void> {
	const res = await fetchFn(groupApiUrl(config, group), {
		method: 'PUT',
		headers: jsonHeaders(config, { 'If-None-Match': '*' }),
		body: JSON.stringify({ 'unrestricted-tokens': true })
	});
	// 412/409: already created. 200/201/204: created.
	if (res.ok || res.status === 412 || res.status === 409) {
		await stripAuthPortal(config, group, fetchFn);
		await ensureOpenJoin(config, group, fetchFn);
		return;
	}
	throw new GaleneError(await readError(res), res.status);
}

export type InviteOptions = {
	username?: string;
	operator?: boolean;
};

/** POST a stateful invite token (Zulip: `/groups/{id}/.tokens/`). */
export async function createInviteToken(
	config: GaleneConfig,
	group: string,
	options: InviteOptions = {},
	fetchFn: typeof fetch = fetch
): Promise<string> {
	const body: Record<string, unknown> = {
		permissions: options.operator ? OPERATOR_PERMISSIONS : PRESENTER_PERMISSIONS,
		expires: new Date(Date.now() + GALENE_TOKEN_TTL_MS).toISOString()
	};
	const username = options.username?.trim();
	if (username) body.username = username;

	const res = await fetchFn(
		`${config.baseUrl}/galene-api/v0/.groups/${encodeURIComponent(group)}/.tokens/`,
		{
			method: 'POST',
			headers: jsonHeaders(config),
			body: JSON.stringify(body)
		}
	);
	if (!res.ok) {
		throw new GaleneError(await readError(res), res.status);
	}
	const token = tokenFromLocation(res.headers.get('location') ?? '');
	if (!token) {
		throw new GaleneError('Galene did not return an invite token', 502);
	}
	return token;
}

export function galeneJoinUrl(config: GaleneConfig, group: string, token: string): string {
	return `${config.baseUrl}/group/${encodeURIComponent(group)}/?token=${encodeURIComponent(token)}`;
}

export async function mintJoinUrl(
	config: GaleneConfig,
	group: string,
	options: InviteOptions = {},
	fetchFn: typeof fetch = fetch
): Promise<string> {
	await ensureGroup(config, group, fetchFn);
	const token = await createInviteToken(config, group, options, fetchFn);
	return galeneJoinUrl(config, group, token);
}

/** Display name Galene shows in the roster. */
export function galeneDisplayName(account: { displayName?: string; username: string }): string {
	const raw = account.displayName?.trim() || account.username.split('@')[0] || 'user';
	return raw.replace(/[\u0000-\u001f\\/]/g, '').slice(0, 64);
}
