/**
 * Forgotten password. The register service owns it — it knows the recovery
 * address, mails the link and sets the new password on Stalwart — so these
 * forms only carry the request there, with the person's IP signed along.
 * The link register mails points at /forgot-password/reset on WEBMAIL_URL.
 */
import { form, getRequestEvent } from '$app/server';
import { checkRateLimitRow, getStoreDb } from '@zaur/server-auth';
import { getClientAddress } from '#lib/server/login';
import { isPasswordResetEnabled, passwordReset } from '#lib/server/recovery';
import { reportError } from '#lib/server/report';

export interface ResetResult {
	ok: boolean;
	message?: string;
	error?: string;
}

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

/** Ten a quarter-hour per address, as webmail's proxy allowed; register limits again. */
function tooMany(kind: string, clientIp: string): string | null {
	const limit = checkRateLimitRow(getStoreDb(), `mail2-${kind}:${clientIp}`, 10, 15 * 60 * 1000);
	return limit.allowed ? null : `Too many attempts. Try again in ${limit.retryAfterSec}s.`;
}

async function carry(
	path: 'request' | 'reset',
	payload: Record<string, string>,
	fallback: string
): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; error: string }> {
	if (!isPasswordResetEnabled()) return { ok: false, error: 'Password reset is not available here.' };
	const clientIp = getClientAddress(getRequestEvent().request);
	const limited = tooMany(`forgot-password-${path}`, clientIp);
	if (limited) return { ok: false, error: limited };
	try {
		const { ok, data } = await passwordReset(path, clientIp, payload);
		return ok ? { ok: true, data } : { ok: false, error: String(data.error || fallback) };
	} catch (cause) {
		reportError(cause, { where: `forgot-password: ${path}` });
		return { ok: false, error: `${fallback} Try again in a while.` };
	}
}

/** Mail a reset link to the account's recovery address. */
export const requestReset = form('unchecked', async (data): Promise<ResetResult> => {
	const email = text(data.email);
	if (!email) return { ok: false, error: 'Enter your address.' };
	const answer = await carry('request', { email }, 'The reset link could not be sent.');
	if (!answer.ok) return answer;
	// Register says the same thing whether or not the account exists.
	const message =
		String(answer.data.message || '') ||
		'If there is an account for that address, a reset link is on its way to its recovery email.';
	return { ok: true, message };
});

/** Set the new password with the token from the link. */
export const resetPassword = form('unchecked', async (data): Promise<ResetResult> => {
	const email = text(data.email);
	const token = text(data.token);
	const password = typeof data._password === 'string' ? data._password : '';
	const confirmPassword = typeof data._confirm === 'string' ? data._confirm : '';
	if (!email || !token) return { ok: false, error: 'This reset link is incomplete.' };
	if (password.length < 8) return { ok: false, error: 'Use at least 8 characters.' };
	if (password !== confirmPassword) return { ok: false, error: 'The two passwords do not match.' };
	const answer = await carry(
		'reset',
		{ email, token, password, confirmPassword },
		'The password could not be changed.'
	);
	return answer.ok ? { ok: true } : answer;
});
