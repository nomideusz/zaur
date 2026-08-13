function normalizeBaseUrl(raw: string | null | undefined): string {
	const trimmed = raw?.trim() ?? '';
	if (!trimmed) return '';
	const withProtocol = trimmed.includes('://') ? trimmed : `https://${trimmed}`;
	return withProtocol.replace(/\/+$/, '');
}

/** Invite tokens last a working day so calendar guests can join late. */
export const GALENE_TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

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

function groupBody(authPortal?: string): string {
	return JSON.stringify(authPortal ? { authPortal } : {});
}

/** If the group already exists, set authPortal so a token-less visit bounces back. */
async function ensureAuthPortal(
	config: GaleneConfig,
	group: string,
	authPortal: string,
	fetchFn: typeof fetch
): Promise<void> {
	const url = groupApiUrl(config, group);
	const get = await fetchFn(url, { headers: apiHeaders(config) });
	if (!get.ok) return;
	const desc = (await get.json().catch(() => null)) as { authPortal?: string } | null;
	if (!desc || desc.authPortal === authPortal) return;
	const etag = get.headers.get('etag')?.trim();
	const put = await fetchFn(url, {
		method: 'PUT',
		headers: apiHeaders(config, {
			'Content-Type': 'application/json',
			...(etag ? { 'If-Match': etag } : {})
		}),
		body: JSON.stringify({ ...desc, authPortal })
	});
	if (!put.ok && put.status !== 412) {
		throw new GaleneError(await readError(put), put.status);
	}
}

/** PUT the group if it does not exist yet (If-None-Match: *). */
export async function ensureGroup(
	config: GaleneConfig,
	group: string,
	fetchFn: typeof fetch = fetch,
	authPortal?: string
): Promise<void> {
	const res = await fetchFn(groupApiUrl(config, group), {
		method: 'PUT',
		headers: apiHeaders(config, {
			'Content-Type': 'application/json',
			'If-None-Match': '*'
		}),
		body: groupBody(authPortal)
	});
	// 412/409: already created. 200/201/204: created.
	if (res.ok || res.status === 412 || res.status === 409) {
		if (authPortal && (res.status === 412 || res.status === 409)) {
			await ensureAuthPortal(config, group, authPortal, fetchFn);
		}
		return;
	}
	throw new GaleneError(await readError(res), res.status);
}

export type InviteOptions = {
	username?: string;
	operator?: boolean;
	/** Webmail `/meet/{group}` URL. Galene redirects here when the invite token is missing. */
	authPortal?: string;
};

/** POST a stateful invite token (Zulip: `/groups/{id}/.tokens/`). */
export async function createInviteToken(
	config: GaleneConfig,
	group: string,
	options: InviteOptions = {},
	fetchFn: typeof fetch = fetch
): Promise<string> {
	const body: Record<string, unknown> = {
		permissions: options.operator ? ['op'] : ['present', 'message'],
		expires: new Date(Date.now() + GALENE_TOKEN_TTL_MS).toISOString()
	};
	const username = options.username?.trim();
	if (username) body.username = username;

	const res = await fetchFn(
		`${config.baseUrl}/galene-api/v0/.groups/${encodeURIComponent(group)}/.tokens/`,
		{
			method: 'POST',
			headers: apiHeaders(config, { 'Content-Type': 'application/json' }),
			body: JSON.stringify(body)
		}
	);
	if (!res.ok) {
		throw new GaleneError(await readError(res), res.status);
	}
	const location = res.headers.get('location')?.trim() ?? '';
	const token = location.split('/').filter(Boolean).pop() ?? '';
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
	await ensureGroup(config, group, fetchFn, options.authPortal);
	const token = await createInviteToken(config, group, options, fetchFn);
	return galeneJoinUrl(config, group, token);
}

/** Display name Galene shows in the roster. */
export function galeneDisplayName(account: { displayName?: string; username: string }): string {
	const raw = account.displayName?.trim() || account.username.split('@')[0] || 'user';
	return raw.replace(/[\u0000-\u001f]/g, '').slice(0, 64);
}
