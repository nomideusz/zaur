import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { JMAPClient } from '@zaur/mail-core';

// The login path rate-limits through the SQLite store; keep it off the real one.
process.env.STORE_DB_PATH = path.join(mkdtempSync(path.join(tmpdir(), 'mail2-generic-')), 'store.sqlite');

const { attemptLogin, jmapAuthMode, jmapServerUrl } = await import('../src/lib/server/login.ts');
const { checkCredentials } = await import('../src/lib/server/security.ts');
const { featuresOf, offered } = await import('../src/lib/features.ts');

/**
 * Sign-in against servers other than Stalwart's credential flow: HTTP Basic
 * (Cyrus, Apache James, Stalwart without OAuth) and a Bearer API token
 * (Fastmail), plus which sections a mail-only server gets.
 */
const MAIL = 'urn:ietf:params:jmap:mail';
const MAIL_ONLY = {
	'urn:ietf:params:jmap:core': {},
	[MAIL]: {},
	'urn:ietf:params:jmap:submission': {}
};
const EVERYTHING = {
	...MAIL_ONLY,
	'urn:ietf:params:jmap:calendars': {},
	'urn:ietf:params:jmap:contacts': {},
	'urn:ietf:params:jmap:filenode': {},
	'urn:ietf:params:jmap:sieve': {},
	'urn:ietf:params:jmap:vacationresponse': {},
	'urn:ietf:params:jmap:principals': {}
};

function session(username: string, capabilities: Record<string, unknown>) {
	return {
		apiUrl: 'https://jmap.test/api/',
		downloadUrl: 'https://blobs.test/download/{accountId}/{blobId}/{name}?type={type}',
		uploadUrl: 'https://jmap.test/upload/{accountId}/',
		eventSourceUrl: 'https://jmap.test/events?types={types}&closeafter={closeafter}&ping={ping}',
		username,
		state: 's',
		capabilities,
		// Like Stalwart 0.16: its own capability is per account, never on the session.
		primaryAccounts: { [MAIL]: 'a1', ...(capabilities === EVERYTHING ? { 'urn:stalwart:jmap': 'a1' } : {}) },
		accounts: { a1: { name: username, accountCapabilities: { [MAIL]: {} } } }
	};
}

/** A JMAP server that takes one Authorization header, at one session URL. */
function serve(opts: { sessionUrl: string; authorization: string; username: string; capabilities?: Record<string, unknown> }) {
	const seen: string[] = [];
	const realFetch = globalThis.fetch;
	globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
		const auth = new Headers(init?.headers).get('authorization') ?? '';
		seen.push(`${init?.method ?? 'GET'} ${String(url)} ${auth}`);
		if (auth !== opts.authorization) return new Response('Unauthorized', { status: 401 });
		if (String(url) === opts.sessionUrl) {
			return new Response(JSON.stringify(session(opts.username, opts.capabilities ?? MAIL_ONLY)));
		}
		if (!init?.body) return new Response('blob');
		const body = JSON.parse(String(init.body)) as { methodCalls: [string, unknown, string][] };
		const methodResponses = body.methodCalls.map(([name, , id]) => [
			name,
			{ list: [{ id: 'i1', name: 'Ada Lovelace', email: opts.username }] },
			id
		]);
		return new Response(JSON.stringify({ methodResponses }));
	}) as typeof fetch;
	return { seen, restore: () => void (globalThis.fetch = realFetch) };
}

const basic = (user: string, pass: string) => `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;

function login(email: string, password: string) {
	return attemptLogin({
		email,
		password,
		remember: false,
		requestOrigin: 'https://webmail.test',
		clientAddress: '203.0.113.1',
		userAgent: null
	});
}

function withEnv<T>(env: Record<string, string | undefined>, run: () => Promise<T>): Promise<T> {
	const saved = Object.fromEntries(Object.keys(env).map((key) => [key, process.env[key]]));
	Object.assign(process.env, env);
	for (const [key, value] of Object.entries(env)) if (value === undefined) delete process.env[key];
	return run().finally(() => {
		for (const [key, value] of Object.entries(saved)) {
			if (value === undefined) delete process.env[key];
			else process.env[key] = value;
		}
	});
}

test('JMAP_AUTH: stalwart unless basic or token is asked for', () => {
	assert.equal(jmapAuthMode({}), 'stalwart');
	assert.equal(jmapAuthMode({ JMAP_AUTH: 'Basic ' }), 'basic');
	assert.equal(jmapAuthMode({ JMAP_AUTH: 'token' }), 'token');
	assert.equal(jmapAuthMode({ JMAP_AUTH: 'nonsense' }), 'stalwart');
});

test('basic: the password goes to the discovered session as HTTP Basic and is kept server-side only', async () => {
	const server = serve({
		sessionUrl: 'https://cyrus.test/.well-known/jmap',
		authorization: basic('ada@cyrus.test', 'hunter2'),
		username: 'ada@cyrus.test'
	});
	try {
		await withEnv(
			{ JMAP_AUTH: 'basic', PUBLIC_JMAP_SERVER_URL: 'https://cyrus.test', STALWART_OAUTH_ENABLED: 'true', STALWART_OAUTH_CLIENT_ID: 'x', STALWART_OAUTH_ISSUER_URL: 'https://cyrus.test' },
			async () => {
				const ok = await login('Ada@Cyrus.test', 'hunter2');
				assert.equal(ok.status, 'ok');
				assert.ok(ok.status === 'ok');
				assert.equal(ok.sessionData.authMethod, 'password');
				assert.equal(ok.sessionData.password, 'hunter2');
				assert.equal(ok.sessionData.displayName, 'Ada Lovelace');
				// STALWART_OAUTH_* is ignored in basic mode: nothing went to /api/auth.
				assert.ok(server.seen.every((line) => !line.includes('/api/auth')));

				assert.deepEqual(await login('ada@cyrus.test', 'wrong'), { status: 'invalid_credentials' });
			}
		);
	} finally {
		server.restore();
	}
});

test('token: the API token goes as Bearer to a session URL with a path (Fastmail), named by the server', async () => {
	const server = serve({
		sessionUrl: 'https://api.fastmail.test/jmap/session',
		authorization: 'Bearer fmu1-token',
		username: 'ada@fastmail.test'
	});
	try {
		await withEnv({ JMAP_AUTH: 'token', PUBLIC_JMAP_SERVER_URL: 'https://api.fastmail.test/jmap/session' }, async () => {
			const ok = await login('ADA@fastmail.test', ' fmu1-token ');
			assert.ok(ok.status === 'ok');
			assert.deepEqual(
				{ ...ok.sessionData, displayName: undefined },
				{
					serverUrl: 'https://api.fastmail.test/jmap/session',
					username: 'ada@fastmail.test',
					authMethod: 'token',
					accessToken: 'fmu1-token',
					displayName: undefined
				}
			);
			assert.ok(!server.seen.some((line) => line.includes('.well-known')), 'no discovery for a session URL');
			assert.deepEqual(await login('ada@fastmail.test', 'fmu1-wrong'), { status: 'invalid_credentials' });

			// Confirming identity on a token session takes the token, and only this account's.
			const account = ok.sessionData;
			assert.equal((await checkCredentials({ account, password: 'fmu1-token', requestOrigin: 'https://webmail.test' })).status, 'verified');
			assert.equal((await checkCredentials({ account, password: 'nope', requestOrigin: 'https://webmail.test' })).status, 'failure');
			const other = { ...account, username: 'eve@fastmail.test' };
			assert.equal((await checkCredentials({ account: other, password: 'fmu1-token', requestOrigin: 'https://webmail.test' })).status, 'failure');
		});
	} finally {
		server.restore();
	}
});

test('no server configured: sign-in is unavailable rather than going to somebody else’s', async () => {
	await withEnv({ JMAP_AUTH: 'basic', PUBLIC_JMAP_SERVER_URL: undefined }, async () => {
		assert.deepEqual(await login('ada@example.com', 'x'), { status: 'unavailable' });
	});
	// Stalwart mode falls back to the OAuth issuer, the same server (what production sets).
	await withEnv({ JMAP_AUTH: undefined, PUBLIC_JMAP_SERVER_URL: undefined, STALWART_OAUTH_ISSUER_URL: 'https://mail.example.com' }, async () => {
		assert.equal(jmapServerUrl(), 'https://mail.example.com');
	});
});

test('a server that hands blobs out from another host keeps it, and {type} is filled in', async () => {
	const server = serve({
		sessionUrl: 'https://api.fastmail.test/jmap/session',
		authorization: 'Bearer t',
		username: 'ada@fastmail.test'
	});
	try {
		const client = new JMAPClient('https://api.fastmail.test/jmap/session', 'ada@fastmail.test', 't', false, true);
		await client.connect();
		assert.equal(client.getSession()?.downloadUrl, 'https://blobs.test/download/{accountId}/{blobId}/{name}?type={type}');
		await client.downloadBlob('b1', 'a.pdf', 'application/pdf');
		assert.ok(server.seen.at(-1)!.startsWith('GET https://blobs.test/download/a1/b1/a.pdf?type=application%2Fpdf '));
	} finally {
		server.restore();
	}
});

test('features: a mail-only server offers no calendar, contacts, files, rules, auto-reply, sharing or security pages', async () => {
	for (const [capabilities, expected] of [
		[MAIL_ONLY, false],
		[EVERYTHING, true]
	] as const) {
		// A host per round: the client caches sessions per server and credentials.
		const host = `https://s-${expected}.test`;
		const server = serve({ sessionUrl: `${host}/.well-known/jmap`, authorization: basic('a@s.test', 'p'), username: 'a@s.test', capabilities });
		try {
			const client = new JMAPClient(host, 'a@s.test', 'p');
			await client.connect();
			const features = featuresOf(client);
			assert.deepEqual(Object.values(features), Array(7).fill(expected));
			// Push asks only for types the server has (James answers 400 to others).
			await client.openEventStream();
			assert.equal(server.seen.at(-1)!.includes('CalendarEvent'), expected);
			assert.ok(server.seen.at(-1)!.includes('types=Mailbox%2CEmail'));
			for (const href of ['/calendar', '/contacts', '/files', '/settings/rules', '/settings/auto-reply', '/settings/sharing', '/settings/security', '/settings/app-passwords']) {
				assert.equal(offered(href, features), expected, href);
			}
			// Mail and the rest of settings are always there; an unknown server shows everything.
			for (const href of ['/', '/settings', '/settings/folders', '/settings/devices']) assert.equal(offered(href, features), true);
			assert.equal(offered('/calendar', null), true);
		} finally {
			server.restore();
		}
	}
});
