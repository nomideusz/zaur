import type { RequestHandler } from './$types';
import { createCredential } from '$lib/server/account-security';
import {
	assertSameOriginJson,
	requireSecurityAccount,
	securityJson
} from '$lib/server/security-request';
import { hasRecentStepUp } from '$lib/server/step-up';

export const POST: RequestHandler = async ({ request, cookies, url }) => {
	assertSameOriginJson(request, url);
	const account = requireSecurityAccount(cookies, request);
	if (!hasRecentStepUp(account)) return securityJson({ reauthRequired: true }, { status: 428 });
	const body = (await request.json().catch(() => ({}))) as {
		description?: string;
		expiresAt?: string | null;
		allowedIps?: string[];
	};
	const description = body.description?.trim();
	if (!description || description.length > 100) {
		return securityJson({ error: 'A description is required' }, { status: 400 });
	}
	try {
		const credential = await createCredential(account, 'AppPassword', {
			description,
			expiresAt: body.expiresAt,
			allowedIps: body.allowedIps
		});
		return securityJson({ credential }, { status: 201 });
	} catch {
		return securityJson({ error: 'Could not create app password' }, { status: 400 });
	}
};
