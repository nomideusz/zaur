import { createHash, createHmac, randomBytes } from 'node:crypto';
import { env } from '$env/dynamic/private';

const PATH = '/api/internal/recovery';

function config() {
	const baseUrl = env.REGISTER_INTERNAL_URL?.trim()?.replace(/\/$/, '');
	const secret = env.REGISTER_INTERNAL_SECRET?.trim();
	if (!baseUrl || !secret) throw new Error('Recovery service is not configured');
	return { baseUrl, secret };
}

async function request(method: 'GET' | 'POST', query = '', body?: Record<string, string>) {
	const { baseUrl, secret } = config();
	const timestamp = String(Date.now());
	const nonce = randomBytes(16).toString('base64url');
	const bodyText = body ? JSON.stringify(body) : '';
	const bodyHash = createHash('sha256').update(bodyText).digest('hex');
	const requestTarget = `${PATH}${query}`;
	const signature = createHmac('sha256', secret)
		.update(`${timestamp}.${nonce}.${method}.${requestTarget}.${bodyHash}`)
		.digest('hex');
	const response = await fetch(`${baseUrl}${PATH}${query}`, {
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
	if (!response.ok) throw new Error('Recovery service request failed');
	return response.json() as Promise<Record<string, unknown>>;
}

export function getRecoveryEmail(mailboxEmail: string) {
	return request('GET', `?mailbox=${encodeURIComponent(mailboxEmail)}`);
}

export function requestRecoveryEmailChange(mailboxEmail: string, recoveryEmail: string) {
	return request('POST', '', { mailboxEmail, recoveryEmail });
}
