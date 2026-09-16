/**
 * Security settings: password, two-factor, app passwords, API keys, sessions,
 * recovery email. See `#lib/server/security` for how the step-up works and
 * `@zaur/server-auth`'s `account-security` for the Stalwart calls.
 *
 * Forms rather than commands wherever a password crosses the wire: a form
 * field whose name starts with `_` is never echoed back to the page, and a
 * form still works without JavaScript. Commands are for id-shaped actions.
 */
import * as v from 'valibot';
import { error } from '@sveltejs/kit';
import { command, form, getRequestEvent, query } from '$app/server';
import {
	AccountSecurityError,
	accountKey,
	changeAccountPassword,
	consumeTotpSetup,
	createCredential,
	disableTotp as disableTotpOnServer,
	enableTotp,
	generateTotpSecret,
	buildOtpAuthUrl,
	getAccountSecurityOverview,
	getStoreDb,
	listAccountSessions,
	putTotpSetup,
	revokeAccountSession,
	revokeCredential,
	revokeOtherAccountSessions,
	sealSession,
	unsealSession,
	verifyTotpCode,
	type CredentialSummary,
	type CredentialType
} from '@zaur/server-auth';
import { connect, requireSession } from '#lib/server/account';
import { getClientAddress } from '#lib/server/login';
import {
	checkCredentials,
	checkSecurityRateLimit,
	grantStepUp,
	hasRecentStepUp,
	isOauthAccount
} from '#lib/server/security';
import {
	getRecoveryEmail,
	isRecoveryConfigured,
	requestRecoveryEmailChange
} from '#lib/server/recovery';
import { reportError } from '#lib/server/report';

const TOTP_ISSUER = 'Zaur Mail';
const TOTP_SETUP_TTL_MS = 10 * 60_000;

/* ── Shapes ─────────────────────────────────────────────────────────────── */

export interface SessionDTO {
	id: string;
	current: boolean;
	createdAt: number;
	lastSeenAt: number;
	userAgent: string | null;
}

export interface SecurityOverview {
	/** How this session authenticates — TOTP management needs 'oauth'. */
	authMethod: 'oauth' | 'password';
	/** Epoch ms until which the identity proof holds; null when it does not. */
	verifiedUntil: number | null;
	totpEnabled: boolean;
	appPasswords: CredentialSummary[];
	apiKeys: CredentialSummary[];
	sessions: SessionDTO[];
	recovery: { available: boolean; email: string | null };
	/** Set when Stalwart could not be asked; the local parts still render. */
	serverError: string | null;
}

export type FormOutcome =
	| { ok: true; message?: string }
	| { ok: false; error: string; requiresTotp?: boolean };

const password = v.pipe(v.string(), v.minLength(1, 'Enter your password'), v.maxLength(256));
const totp = v.optional(v.pipe(v.string(), v.maxLength(16)));
const totpCode = v.pipe(
	v.string(),
	v.transform((s) => s.replace(/\s+/g, '')),
	v.regex(/^\d{6}$/, 'Enter the six-digit code')
);
const credentialKind = v.picklist(['AppPassword', 'ApiKey']);

/* ── Helpers ────────────────────────────────────────────────────────────── */

function failure(cause: unknown, fallback: string): FormOutcome {
	if (cause instanceof AccountSecurityError) return { ok: false, error: cause.userMessage };
	if (cause instanceof Error && cause.message === 'Unauthorized') error(401, 'Unauthorized');
	console.error('[security]', cause);
	reportError(cause, { where: 'security' });
	return { ok: false, error: fallback };
}

function stepUpOrFail(): FormOutcome | null {
	const { account } = requireSession();
	return hasRecentStepUp(account) ? null : { ok: false, error: 'Confirm your password first.' };
}

function requireStepUp(): void {
	const { account } = requireSession();
	if (!hasRecentStepUp(account)) error(428, 'Confirm your password first');
}

function rateLimited(kind: 'identity' | 'mutation'): FormOutcome | null {
	const { account } = requireSession();
	const limit = checkSecurityRateLimit(kind, account, getClientAddress(getRequestEvent().request));
	return limit.allowed
		? null
		: { ok: false, error: `Too many attempts. Try again in ${limit.retryAfterSec}s.` };
}

/* ── Read ───────────────────────────────────────────────────────────────── */

export const securityOverview = query(async (): Promise<SecurityOverview> => {
	const { session, account } = requireSession();
	const { cookies } = getRequestEvent();
	const db = getStoreDb();
	const key = accountKey(account.username);

	const proof = db
		.prepare('SELECT expires_at FROM step_up_proofs WHERE session_id = ? AND account_key = ?')
		.get(session.id, key) as { expires_at: number } | undefined;
	const verifiedUntil = proof && proof.expires_at > Date.now() ? proof.expires_at : null;

	let totpEnabled = false;
	let appPasswords: CredentialSummary[] = [];
	let apiKeys: CredentialSummary[] = [];
	let serverError: string | null = null;
	try {
		const client = await connect(account);
		({ totpEnabled, appPasswords, apiKeys } = await getAccountSecurityOverview(client));
	} catch (cause) {
		if (cause instanceof Error && cause.message === 'Unauthorized') error(401, 'Unauthorized');
		serverError =
			cause instanceof AccountSecurityError
				? cause.userMessage
				: 'Could not read the account security state from the mail server.';
	}

	let recoveryEmail: string | null = null;
	const recoveryAvailable = isRecoveryConfigured();
	if (recoveryAvailable) {
		try {
			recoveryEmail = await getRecoveryEmail(account.username);
		} catch {
			recoveryEmail = null;
		}
	}

	return {
		authMethod: isOauthAccount(account) ? 'oauth' : 'password',
		verifiedUntil,
		totpEnabled,
		appPasswords,
		apiKeys,
		sessions: listAccountSessions(cookies),
		recovery: { available: recoveryAvailable, email: recoveryEmail },
		serverError
	};
});

/* ── Identity ───────────────────────────────────────────────────────────── */

/**
 * Prove it is you: re-authenticate against Stalwart and open a five-minute
 * window for the actions that need it. Also the moment a password-only dev
 * session re-seals its password, and an OAuth session refreshes its tokens.
 */
export const confirmIdentity = form(
	v.object({ _password: password, totp }),
	async ({ _password, totp: code }): Promise<FormOutcome> => {
		const limited = rateLimited('identity');
		if (limited) return limited;
		const event = getRequestEvent();
		const { account } = requireSession();
		const result = await checkCredentials({
			account,
			password: _password,
			totp: code,
			requestOrigin: event.url.origin
		});
		switch (result.status) {
			case 'verified':
				grantStepUp(event.cookies, account, result.next);
				return { ok: true, message: 'Identity confirmed for five minutes.' };
			case 'mfa_required':
				return { ok: false, error: 'Enter your authentication code.', requiresTotp: true };
			case 'failure':
				return { ok: false, error: 'That password (or code) is not right.' };
			case 'unavailable':
				return { ok: false, error: 'The mail server could not be reached. Try again shortly.' };
		}
	}
);

/* ── Password ───────────────────────────────────────────────────────────── */

export const changePassword = form(
	v.object({
		_current: password,
		_next: v.pipe(
			v.string(),
			v.minLength(8, 'Use at least 8 characters'),
			v.maxLength(128, 'Use at most 128 characters')
		),
		_confirm: v.string(),
		totp
	}),
	async ({ _current, _next, _confirm, totp: code }): Promise<FormOutcome> => {
		if (_next !== _confirm) return { ok: false, error: 'The new passwords do not match.' };
		if (_next === _current) return { ok: false, error: 'Choose a password you have not used here.' };
		const limited = rateLimited('identity');
		if (limited) return limited;

		const event = getRequestEvent();
		const { account } = requireSession();
		try {
			const client = await connect(account);
			await changeAccountPassword(client, {
				currentPassword: _current,
				newPassword: _next,
				totp: code
			});
		} catch (cause) {
			return failure(cause, 'The password could not be changed.');
		}

		// Stalwart revokes every token the account held. Sign this session back
		// in with the new password so the page you are on keeps working; if that
		// fails, the next request lands on /login, which is the honest fallback.
		try {
			const again = await checkCredentials({
				account,
				password: _next,
				totp: code,
				requestOrigin: event.url.origin
			});
			if (again.status === 'verified') grantStepUp(event.cookies, account, again.next);
		} catch (cause) {
			console.warn('[security] re-sign-in after password change failed:', cause);
		}
		return { ok: true, message: 'Password changed. Other devices will need to sign in again.' };
	}
);

/* ── Two-factor ─────────────────────────────────────────────────────────── */

export interface TotpSetup {
	secret: string;
	uri: string;
}

/**
 * Mint a secret and park it, sealed, against this session for ten minutes.
 * The page renders the QR from `uri`; nothing reaches Stalwart until the
 * person proves the authenticator has it (`confirmTotp`).
 */
export const beginTotpSetup = command(async (): Promise<TotpSetup> => {
	requireStepUp();
	const { session, account } = requireSession();
	if (!isOauthAccount(account)) {
		error(409, 'Two-factor authentication can only be set up from a secure sign-in session');
	}
	const secret = generateTotpSecret();
	const uri = buildOtpAuthUrl({ issuer: TOTP_ISSUER, account: account.username, secret });
	putTotpSetup(
		getStoreDb(),
		session.id,
		accountKey(account.username),
		sealSession({ secret, uri }),
		Date.now() + TOTP_SETUP_TTL_MS
	);
	return { secret, uri };
});

export const confirmTotp = form(
	v.object({ _password: password, code: totpCode }),
	async ({ _password, code }): Promise<FormOutcome> => {
		const gate = stepUpOrFail() ?? rateLimited('mutation');
		if (gate) return gate;
		const { session, account } = requireSession();
		if (!isOauthAccount(account)) {
			return {
				ok: false,
				error: 'Two-factor authentication can only be set up from a secure sign-in session.'
			};
		}
		const db = getStoreDb();
		const key = accountKey(account.username);
		const sealed = consumeTotpSetup(db, session.id, key);
		const setup = sealed ? (unsealSession(sealed) as TotpSetup | null) : null;
		if (!setup?.secret || !setup.uri) {
			return { ok: false, error: 'The setup expired. Start again to get a new code.' };
		}
		// Verify against the pending secret *before* enabling: Stalwart does not
		// insist on a code to turn TOTP on, and a mistyped scan would lock the
		// account. A wrong code keeps the setup alive so the QR need not be
		// scanned again.
		if (!verifyTotpCode(setup.secret, code)) {
			putTotpSetup(db, session.id, key, sealSession(setup), Date.now() + TOTP_SETUP_TTL_MS);
			return { ok: false, error: 'That code did not match. Check the app and try again.' };
		}
		try {
			const client = await connect(account);
			await enableTotp(client, { currentPassword: _password, otpUrl: setup.uri, code });
		} catch (cause) {
			putTotpSetup(db, session.id, key, sealSession(setup), Date.now() + TOTP_SETUP_TTL_MS);
			return failure(cause, 'Two-factor authentication could not be enabled.');
		}
		return { ok: true, message: 'Two-factor authentication is on.' };
	}
);

export const disableTotp = form(
	v.object({ _password: password, code: totpCode }),
	async ({ _password, code }): Promise<FormOutcome> => {
		const gate = stepUpOrFail() ?? rateLimited('mutation');
		if (gate) return gate;
		const { account } = requireSession();
		try {
			const client = await connect(account);
			await disableTotpOnServer(client, { currentPassword: _password, code });
		} catch (cause) {
			return failure(cause, 'Two-factor authentication could not be turned off.');
		}
		return { ok: true, message: 'Two-factor authentication is off.' };
	}
);

/* ── App passwords and API keys ─────────────────────────────────────────── */

export type CreatedCredential = FormOutcome & {
	credential?: { id: string; secret: string; kind: CredentialType; description: string };
};

const IP_MASK = /^(\d{1,3}(\.\d{1,3}){3}|[0-9a-f:]+)(\/\d{1,3})?$/i;

export const createCredentialForm = form(
	v.object({
		kind: credentialKind,
		description: v.pipe(
			v.string(),
			v.trim(),
			v.minLength(1, 'Give it a name'),
			v.maxLength(100, 'Keep the name under 100 characters')
		),
		/** '' and '0' both mean "never". */
		expiresInDays: v.optional(v.picklist(['', '0', '30', '90', '365'])),
		allowedIps: v.optional(v.pipe(v.string(), v.maxLength(500)))
	}),
	async ({ kind, description, expiresInDays, allowedIps }): Promise<CreatedCredential> => {
		const gate = stepUpOrFail() ?? rateLimited('mutation');
		if (gate) return gate;
		const masks = (allowedIps ?? '')
			.split(/[\s,]+/)
			.map((s) => s.trim())
			.filter(Boolean);
		const bad = masks.find((mask) => !IP_MASK.test(mask));
		if (bad) return { ok: false, error: `“${bad}” is not an IP address or CIDR range.` };
		const days = Number(expiresInDays ?? '0');
		const expiresAt = days > 0 ? new Date(Date.now() + days * 86_400_000).toISOString() : null;
		try {
			const client = await connect();
			const credential = await createCredential(client, kind, {
				description,
				expiresAt,
				allowedIps: masks
			});
			return { ok: true, credential: { ...credential, kind, description } };
		} catch (cause) {
			return failure(cause, 'The credential could not be created.');
		}
	}
);

export const revokeCredentialCommand = command(
	v.object({ kind: credentialKind, id: v.pipe(v.string(), v.minLength(1), v.maxLength(200)) }),
	async ({ kind, id }): Promise<{ ok: true }> => {
		requireStepUp();
		try {
			const client = await connect();
			await revokeCredential(client, kind, id);
		} catch (cause) {
			if (cause instanceof AccountSecurityError) error(400, cause.userMessage);
			throw cause;
		}
		void securityOverview().refresh();
		return { ok: true };
	}
);

/* ── Sessions ───────────────────────────────────────────────────────────── */

export const revokeSession = command(
	v.object({ id: v.pipe(v.string(), v.minLength(1), v.maxLength(200)) }),
	async ({ id }): Promise<{ revoked: boolean; current: boolean }> => {
		requireStepUp();
		const { session, account } = requireSession();
		const { cookies } = getRequestEvent();
		const current = id === session.id;
		const revoked = revokeAccountSession(cookies, id, accountKey(account.username));
		if (!current) void securityOverview().refresh();
		return { revoked, current };
	}
);

export const revokeOtherSessions = command(async (): Promise<{ revoked: number }> => {
	requireStepUp();
	const { account } = requireSession();
	const revoked = revokeOtherAccountSessions(getRequestEvent().cookies, account.username);
	void securityOverview().refresh();
	return { revoked };
});

/* ── Recovery email ─────────────────────────────────────────────────────── */

export const saveRecoveryEmail = form(
	v.object({
		recoveryEmail: v.pipe(
			v.string(),
			v.trim(),
			v.toLowerCase(),
			v.email('Enter a valid email address'),
			v.maxLength(254)
		)
	}),
	async ({ recoveryEmail }): Promise<FormOutcome> => {
		const gate = stepUpOrFail() ?? rateLimited('mutation');
		if (gate) return gate;
		if (!isRecoveryConfigured()) return { ok: false, error: 'Recovery email is not available here.' };
		const { account } = requireSession();
		if (recoveryEmail === accountKey(account.username)) {
			return { ok: false, error: 'The recovery address has to be a different mailbox.' };
		}
		try {
			await requestRecoveryEmailChange(account.username, recoveryEmail);
		} catch (cause) {
			return failure(cause, 'The recovery email could not be updated.');
		}
		return {
			ok: true,
			message: `Check ${recoveryEmail} for a confirmation link — the change applies once it is opened.`
		};
	}
);
