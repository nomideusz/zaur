/**
 * Smoke-test helper: put one fake signed-in session into the local store so
 * the gated `(app)` routes render without a real mailbox.
 *
 * The account points at `SMOKE_JMAP_URL` — by default the fake JMAP server in
 * `fake-jmap.mjs` (`pnpm smoke:jmap`), which answers with sample mailboxes,
 * contacts, calendars and the Stalwart self-service objects. Point it at an
 * unreachable port instead to see every error state at once.
 *
 *   pnpm smoke:jmap        # terminal 1
 *   pnpm smoke:seed        # prints the cookie to set
 *   pnpm dev               # then open http://localhost:5175 with that cookie
 *
 * The seeded session's password is `not-a-real-password`, which the fake
 * accepts for the "confirm it's you" step and for password changes.
 */
import {
	openStoreDb,
	putSessionRow,
	sealSession,
	setSessionAccountDevice,
	syncSessionAccountRows,
	wrapAccount
} from '@zaur/server-auth';

const db = openStoreDb(process.env.STORE_DB_PATH ?? '.data/store.sqlite');
const serverUrl = process.env.SMOKE_JMAP_URL ?? 'http://127.0.0.1:9911';

const id = 'smoke-session-id-0000000000000000000000000000000000000000000';
const now = Date.now();
// SMOKE_OAUTH=1 seeds an OAuth account whose access token has already expired,
// so the first request refreshes it against the fake's rotating token endpoint.
const account = process.env.SMOKE_OAUTH
	? {
			serverUrl,
			username: 'smoke@zaur.app',
			displayName: 'Smoke Tester',
			authMethod: 'oauth' as const,
			accessToken: 'at-0',
			refreshToken: 'rt-0',
			accessTokenExpiresAt: Date.now() - 1000
		}
	: {
			serverUrl,
			username: 'smoke@zaur.app',
			displayName: 'Smoke Tester',
			authMethod: 'password' as const,
			password: 'not-a-real-password'
		};
const session = wrapAccount(account, id, true);
putSessionRow(db, {
	id,
	username: account.username,
	sealedData: sealSession(session),
	createdAt: now - 3 * 86_400_000,
	updatedAt: now,
	expiresAt: null
});
syncSessionAccountRows(db, id, [account.username], now - 3 * 86_400_000);
setSessionAccountDevice(
	db,
	id,
	account.username,
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36 Edg/128.0',
	'abc123'
);

// A second, older device so the sessions list has something to revoke.
const other = 'smoke-session-id-1111111111111111111111111111111111111111111';
putSessionRow(db, {
	id: other,
	username: account.username,
	sealedData: sealSession(wrapAccount(account, other)),
	createdAt: now - 20 * 86_400_000,
	updatedAt: now - 2 * 86_400_000,
	expiresAt: null
});
syncSessionAccountRows(db, other, [account.username], now - 20 * 86_400_000);
setSessionAccountDevice(
	db,
	other,
	account.username,
	'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
	'def456'
);

console.log(`Set this cookie on http://localhost:5175 and open the app:\n  zaur_session=${id}`);
