import { json, type RequestHandler } from '@sveltejs/kit';
import { registerApiFetch, isPasswordResetEnabled } from '$lib/server/register-api';

export const GET: RequestHandler = async ({ url }) => {
	if (!isPasswordResetEnabled()) {
		return json({ valid: false, error: 'Password reset is not available.' }, { status: 503 });
	}

	const email = url.searchParams.get('email')?.trim() ?? '';
	const token = url.searchParams.get('token')?.trim() ?? '';
	if (!email || !token) {
		return json({ valid: false, error: 'Reset link is incomplete.' }, { status: 400 });
	}

	try {
		const response = await registerApiFetch(
			`/api/forgot-password/verify?${new URLSearchParams({ email, token }).toString()}`
		);
		const payload = await response.json().catch(() => ({}));
		return json(payload, { status: response.status });
	} catch (error) {
		console.error('[forgot-password/verify]', error);
		return json({ valid: false, error: 'Unable to verify reset link.' }, { status: 502 });
	}
};
