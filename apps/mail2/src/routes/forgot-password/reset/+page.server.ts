import { redirect } from '@sveltejs/kit';
import { getClientAddress } from '#lib/server/login';
import { isPasswordResetEnabled, passwordReset } from '#lib/server/recovery';
import { reportError } from '#lib/server/report';
import type { PageServerLoad } from './$types';

/** The link from the reset email: check the token before offering the form. */
export const load: PageServerLoad = async ({ url, request }) => {
	if (!isPasswordResetEnabled()) redirect(303, '/login');
	const email = url.searchParams.get('email')?.trim() ?? '';
	const token = url.searchParams.get('token')?.trim() ?? '';
	if (!email || !token) return { email, token, problem: 'This reset link is incomplete.' };
	try {
		const { data } = await passwordReset('verify', getClientAddress(request), { email, token });
		if (data.valid === true) return { email, token, problem: null };
		return { email, token, problem: String(data.error || 'This reset link is invalid or has expired.') };
	} catch (cause) {
		reportError(cause, { where: 'forgot-password: verify' });
		return { email, token, problem: 'The reset link could not be checked right now. Try again in a while.' };
	}
};
