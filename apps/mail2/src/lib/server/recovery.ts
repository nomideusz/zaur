/**
 * Recovery email, which lives with the register service (it owns account
 * creation and password resets), behind an HMAC-signed internal API. Optional:
 * with `REGISTER_INTERNAL_URL` / `REGISTER_INTERNAL_SECRET` unset the
 * security page simply does not offer it. Same wire format as webmail 1.0.
 */
import { createHash, createHmac, randomBytes } from 'node:crypto';

const RECOVERY_PATH = '/api/internal/recovery';

function config(): { baseUrl: string; secret: string } | null {
	const baseUrl = process.env.REGISTER_INTERNAL_URL?.trim().replace(/\/$/, '');
	const secret = process.env.REGISTER_INTERNAL_SECRET?.trim();
	if (!baseUrl || !secret) return null;
	return { baseUrl, secret };
}

export function isRecoveryConfigured(): boolean {
	return config() !== null;
}

async function request(
	method: 'GET' | 'POST',
	path: string,
	query = '',
	body?: Record<string, string>
): Promise<Record<string, unknown>> {
	const settings = config();
	if (!settings) throw new Error('Recovery service is not configured');
	const timestamp = String(Date.now());
	const nonce = randomBytes(16).toString('base64url');
	const bodyText = body ? JSON.stringify(body) : '';
	const bodyHash = createHash('sha256').update(bodyText).digest('hex');
	const target = `${path}${query}`;
	const signature = createHmac('sha256', settings.secret)
		.update(`${timestamp}.${nonce}.${method}.${target}.${bodyHash}`)
		.digest('hex');
	const response = await fetch(`${settings.baseUrl}${target}`, {
		method,
		headers: {
			Accept: 'application/json',
			'x-zaur-timestamp': timestamp,
			'x-zaur-nonce': nonce,
			'x-zaur-signature': signature,
			...(body ? { 'Content-Type': 'application/json' } : {})
		},
		body: bodyText || undefined,
		signal: AbortSignal.timeout(10_000)
	});
	if (!response.ok) throw new Error(`Register internal request failed (${response.status})`);
	return (await response.json()) as Record<string, unknown>;
}

/**
 * Register's password-reset API: it holds the recovery addresses and mails the
 * link, which lands on /forgot-password/reset here. `REGISTER_API_URL` is its
 * public URL (the internal one serves the same routes);
 * `PASSWORD_RESET_ENABLED=false` switches the whole flow off.
 */
function resetBase(): string | null {
	if (process.env.PASSWORD_RESET_ENABLED === 'false') return null;
	const url = (process.env.REGISTER_API_URL || process.env.REGISTER_INTERNAL_URL)?.trim();
	return url ? url.replace(/\/$/, '') : null;
}

export const isPasswordResetEnabled = () => resetBase() !== null;

/**
 * One reset call, answered as register answers it. Register rate-limits by IP,
 * and every call here comes from this server's, so the person's own IP rides
 * along, signed with the shared secret so a caller cannot pick their bucket.
 */
export async function passwordReset(
	path: 'request' | 'verify' | 'reset',
	clientIp: string,
	payload: Record<string, string>
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
	const base = resetBase();
	if (!base) throw new Error('Password reset is not configured');
	const secret = process.env.REGISTER_INTERNAL_SECRET?.trim();
	const get = path === 'verify';
	const headers: Record<string, string> = { Accept: 'application/json' };
	if (!get) headers['Content-Type'] = 'application/json';
	if (secret) {
		headers['x-zaur-client-ip'] = clientIp;
		headers['x-zaur-client-ip-signature'] = createHmac('sha256', secret).update(clientIp).digest('hex');
	}
	const response = await fetch(
		`${base}/api/forgot-password/${path}${get ? `?${new URLSearchParams(payload)}` : ''}`,
		{
			method: get ? 'GET' : 'POST',
			headers,
			body: get ? undefined : JSON.stringify(payload),
			signal: AbortSignal.timeout(15_000)
		}
	);
	const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
	return { ok: response.ok, data };
}

export async function getRecoveryEmail(mailboxEmail: string): Promise<string | null> {
	const data = await request('GET', RECOVERY_PATH, `?mailbox=${encodeURIComponent(mailboxEmail)}`);
	return typeof data.recoveryEmail === 'string' ? data.recoveryEmail : null;
}

/** Name and Stalwart roles, for the OIDC claims. */
export async function getAccountProfile(email: string): Promise<{ name?: string | null; roles?: unknown }> {
	return request('GET', '/api/internal/account', `?email=${encodeURIComponent(email)}`);
}

/** The change is applied by the register service once the new address confirms. */
export async function requestRecoveryEmailChange(
	mailboxEmail: string,
	recoveryEmail: string
): Promise<void> {
	await request('POST', RECOVERY_PATH, '', { mailboxEmail, recoveryEmail });
}
