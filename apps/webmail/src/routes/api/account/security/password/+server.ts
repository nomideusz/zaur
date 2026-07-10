import type { RequestHandler } from './$types';
import { changeAccountPassword } from '$lib/server/account-security';
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
	if (!hasRecentStepUp(account)) {
		return securityJson({ reauthRequired: true }, { status: 428 });
	}
	const body = (await request.json().catch(() => ({}))) as {
		currentPassword?: string;
		newPassword?: string;
		totp?: string;
	};
	if (!body.currentPassword || !body.newPassword || body.newPassword.length < 8) {
		return securityJson({ error: 'A current password and a new password of at least 8 characters are required' }, { status: 400 });
	}
	try {
		await changeAccountPassword(account, {
			currentPassword: body.currentPassword,
			newPassword: body.newPassword,
			totp: body.totp
		});
		const refreshed = await performStepUp({
			account,
			password: body.newPassword,
			totp: body.totp,
			requestOrigin: url.origin
		});
		if (refreshed !== 'verified') throw new Error('Could not refresh authentication');
		rotateSessionId(cookies);
		return securityJson({ changed: true });
	} catch {
		return securityJson({ error: 'Password change failed' }, { status: 400 });
	}
};
