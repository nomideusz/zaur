import type { RequestHandler } from './$types';
import { changeAccountPassword } from '$lib/server/account-security';
import {
	assertSameOriginJson,
	requireSecurityAccount,
	securityJson
} from '$lib/server/security-request';
import { hasRecentStepUp, performStepUp } from '$lib/server/step-up';
import { rotateSessionId } from '$lib/server/session';
import { AccountSecurityError } from '$lib/server/jmap-set-result';
import { reportError } from '$lib/server/report';

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
	} catch (err) {
		// Stalwart's own verdict (wrong current password, weak new one) is the
		// message the user needs; anything else is ours to look at in Traceway.
		if (err instanceof AccountSecurityError) {
			return securityJson({ error: err.userMessage }, { status: 400 });
		}
		reportError(err, { where: 'POST /api/account/security/password', username: account.username });
		return securityJson({ error: 'Password change failed. Please try again later.' }, { status: 502 });
	}

	// The password IS changed from here on — a step-up hiccup must not report failure.
	try {
		const refreshed = await performStepUp({
			account,
			password: body.newPassword,
			totp: body.totp,
			requestOrigin: url.origin
		});
		if (refreshed !== 'verified') throw new Error(`step-up after password change: ${refreshed}`);
		rotateSessionId(cookies);
	} catch (err) {
		reportError(err, { where: 'POST /api/account/security/password (step-up)', username: account.username });
	}
	return securityJson({ changed: true });
};
