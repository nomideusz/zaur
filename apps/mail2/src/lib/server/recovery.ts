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

export async function getRecoveryEmail(mailboxEmail: string): Promise<string | null> {
	const data = await request('GET', RECOVERY_PATH, `?mailbox=${encodeURIComponent(mailboxEmail)}`);
	return typeof data.recoveryEmail === 'string' ? data.recoveryEmail : null;
}

/** The change is applied by the register service once the new address confirms. */
export async function requestRecoveryEmailChange(
	mailboxEmail: string,
	recoveryEmail: string
): Promise<void> {
	await request('POST', RECOVERY_PATH, '', { mailboxEmail, recoveryEmail });
}
