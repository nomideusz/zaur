import { json, type RequestHandler } from '@sveltejs/kit';
import { registerApiFetch, isPasswordResetEnabled } from '$lib/server/register-api';
import { checkRateLimit, getClientAddress } from '$lib/server/rate-limit';

export const POST: RequestHandler = async ({ request }) => {
	if (!isPasswordResetEnabled()) {
		return json({ error: 'Password reset is not available.' }, { status: 503 });
	}

	const clientAddress = getClientAddress(request);
	const limit = checkRateLimit({
		key: `forgot-password:${clientAddress}`,
		limit: 10,
		windowMs: 15 * 60 * 1000
	});
	if (!limit.allowed) {
		return json(
			{ error: `Too many reset requests. Try again in ${limit.retryAfterSec}s.` },
			{ status: 429 }
		);
	}

	let body: { email?: string };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid request body' }, { status: 400 });
	}

	const email = body.email?.trim();
	if (!email) {
		return json({ error: 'Email is required.' }, { status: 400 });
	}

	try {
		const response = await registerApiFetch('/api/forgot-password/request', {
			method: 'POST',
			body: JSON.stringify({ email }),
			clientIp: clientAddress
		});
		const payload = await response.json().catch(() => ({}));
		if (!response.ok) {
			return json(
				{ error: payload.error || 'Unable to send reset instructions.' },
				{ status: response.status }
			);
		}
		return json(payload);
	} catch (error) {
		console.error('[forgot-password/request]', error);
		return json({ error: 'Unable to send reset instructions right now.' }, { status: 502 });
	}
};
