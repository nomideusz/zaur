import { createSign } from 'node:crypto';
import { env } from '$env/dynamic/private';

// FCM HTTP v1 sender using a Firebase service account (FCM_SERVICE_ACCOUNT env,
// the raw JSON). Token exchange + send are plain HTTP — no firebase-admin dep.

interface ServiceAccount {
	project_id: string;
	client_email: string;
	private_key: string;
}

let cachedAccount: ServiceAccount | null | undefined;
let cachedToken: { token: string; expiresAt: number } | undefined;

function serviceAccount(): ServiceAccount | null {
	if (cachedAccount !== undefined) return cachedAccount;
	try {
		const raw = env.FCM_SERVICE_ACCOUNT?.trim();
		const parsed = raw ? (JSON.parse(raw) as ServiceAccount) : null;
		cachedAccount =
			parsed?.project_id && parsed.client_email && parsed.private_key ? parsed : null;
	} catch {
		console.warn('[fcm] FCM_SERVICE_ACCOUNT is not valid JSON');
		cachedAccount = null;
	}
	return cachedAccount;
}

export function isFcmConfigured(): boolean {
	return serviceAccount() !== null;
}

function base64url(input: string | Buffer): string {
	return Buffer.from(input).toString('base64url');
}

async function getAccessToken(account: ServiceAccount): Promise<string> {
	const now = Math.floor(Date.now() / 1000);
	if (cachedToken && cachedToken.expiresAt > now + 60) return cachedToken.token;

	const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
	const claims = base64url(
		JSON.stringify({
			iss: account.client_email,
			scope: 'https://www.googleapis.com/auth/firebase.messaging',
			aud: 'https://oauth2.googleapis.com/token',
			iat: now,
			exp: now + 3600
		})
	);
	const signature = createSign('RSA-SHA256')
		.update(`${header}.${claims}`)
		.sign(account.private_key, 'base64url');

	const response = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
			assertion: `${header}.${claims}.${signature}`
		}),
		signal: AbortSignal.timeout(10_000)
	});
	if (!response.ok) throw new Error(`FCM token exchange failed (${response.status})`);

	const payload = (await response.json()) as { access_token: string; expires_in: number };
	cachedToken = { token: payload.access_token, expiresAt: now + payload.expires_in };
	return payload.access_token;
}

export type FcmSendResult = 'sent' | 'failed' | 'gone';

export async function sendFcmNotification(
	deviceToken: string,
	message: { title: string; body: string; url: string; tag: string }
): Promise<FcmSendResult> {
	const account = serviceAccount();
	if (!account) return 'failed';

	try {
		const accessToken = await getAccessToken(account);
		const response = await fetch(
			`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`,
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					message: {
						token: deviceToken,
						notification: { title: message.title, body: message.body },
						// data values must be strings; the WebView reads url on notification tap
						data: { url: message.url, tag: message.tag },
						android: { notification: { tag: message.tag } },
						apns: { payload: { aps: { 'thread-id': message.tag } } }
					}
				}),
				signal: AbortSignal.timeout(10_000)
			}
		);

		if (response.ok) return 'sent';
		// FCM v1 answers 404 UNREGISTERED for tokens that no longer exist.
		if (response.status === 404) return 'gone';
		console.warn('[fcm] Send failed:', response.status, await response.text().catch(() => ''));
		return 'failed';
	} catch (error) {
		console.warn('[fcm] Send failed:', error);
		return 'failed';
	}
}
