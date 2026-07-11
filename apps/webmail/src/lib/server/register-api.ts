import { createHmac } from 'node:crypto';
import { env } from '$env/dynamic/private';

function registerApiUrl(): string {
	const url = env.REGISTER_API_URL?.trim();
	if (!url) {
		// Callers are gated on isPasswordResetEnabled(); reaching this without a
		// configured register service is a programming error, not user input.
		throw new Error('REGISTER_API_URL is not configured');
	}
	return url.replace(/\/$/, '');
}

export async function registerApiFetch(
	path: string,
	init?: RequestInit & { clientIp?: string }
): Promise<Response> {
	const url = `${registerApiUrl()}${path.startsWith('/') ? path : `/${path}`}`;
	const { clientIp, ...rest } = init ?? {};
	// Forward the real client IP so register's rate-limit buckets aren't shared
	// across every webmail-proxied user. Signed so a public caller can't spoof it.
	// ponytail: bare HMAC(ip), no nonce — headers travel server-to-server over TLS,
	// clients never see a signature to replay.
	const secret = env.REGISTER_INTERNAL_SECRET?.trim();
	const ipHeaders =
		clientIp && secret
			? {
					'x-zaur-client-ip': clientIp,
					'x-zaur-client-ip-signature': createHmac('sha256', secret)
						.update(clientIp)
						.digest('hex')
				}
			: undefined;
	return fetch(url, {
		...rest,
		headers: {
			Accept: 'application/json',
			...(rest.body ? { 'Content-Type': 'application/json' } : {}),
			...ipHeaders,
			...rest.headers
		}
	});
}

// Password reset proxies to the register service, so it needs REGISTER_API_URL
// to be configured at all; PASSWORD_RESET_ENABLED=false force-disables it.
export function isPasswordResetEnabled(): boolean {
	return Boolean(env.REGISTER_API_URL?.trim()) && env.PASSWORD_RESET_ENABLED !== 'false';
}
