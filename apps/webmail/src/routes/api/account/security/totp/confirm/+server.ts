import type { RequestHandler } from './$types';
import { confirmTotpSetup } from '$lib/server/account-security';
import {
	assertSameOriginJson,
	requireSecurityAccount,
	securityJson
} from '$lib/server/security-request';
import { hasRecentStepUp, performStepUp } from '$lib/server/step-up';
import { rotateSessionId } from '$lib/server/session';

export const POST: RequestHandler = async ({ request, cookies, url }) => {
	assertSameOriginJson(request, url);
	const account = requireSecurityAccount(cookies, request);
	if (!hasRecentStepUp(account)) return securityJson({ reauthRequired: true }, { status: 428 });
	const body = (await request.json().catch(() => ({}))) as {
		currentPassword?: string;
		code?: string;
	};
	if (!body.currentPassword || !/^\d{6}$/.test(body.code ?? '')) {
		return securityJson({ error: 'Password and six-digit code are required' }, { status: 400 });
	}
	try {
		await confirmTotpSetup(account, {
			currentPassword: body.currentPassword,
			code: body.code!
		});
		const refreshed = await performStepUp({
			account,
			password: body.currentPassword,
			totp: body.code,
			requestOrigin: url.origin
		});
		if (refreshed !== 'verified') throw new Error('Could not refresh authentication');
		rotateSessionId(cookies);
		return securityJson({ enabled: true });
	} catch {
		return securityJson({ error: 'The authentication code could not be verified' }, { status: 400 });
	}
};
