import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	createInviteToken,
	ensureGroup,
	galeneConfigFromEnv,
	galeneDisplayName,
	galeneJoinUrl,
	mintJoinUrl,
	tokenFromLocation
} from '../src/lib/server/galene.ts';

const config = {
	baseUrl: 'https://meet.zaur.app',
	adminUser: 'admin',
	adminPassword: 'secret'
};

describe('galene admin client', () => {
	it('reads config from env and ignores a missing password', () => {
		assert.deepEqual(
			galeneConfigFromEnv(
				{ GALENE_ADMIN_USER: 'admin', GALENE_ADMIN_PASSWORD: 's3cret' },
				{ PUBLIC_GALENE_URL: 'https://meet.zaur.app/' }
			),
			{ baseUrl: 'https://meet.zaur.app', adminUser: 'admin', adminPassword: 's3cret' }
		);
		assert.equal(
			galeneConfigFromEnv({ GALENE_ADMIN_PASSWORD: '' }, { PUBLIC_GALENE_URL: 'https://meet.zaur.app' }),
			null
		);
		assert.deepEqual(
			galeneConfigFromEnv(
				{ GALENE_ADMIN_PASSWORD: 's3cret' },
				{ PUBLIC_JITSI_URL: 'https://meet.zaur.app' }
			),
			{ baseUrl: 'https://meet.zaur.app', adminUser: 'admin', adminPassword: 's3cret' }
		);
	});

	it('builds a Galene join URL with the required trailing slash', () => {
		assert.equal(
			galeneJoinUrl(config, 'zaur-abc', 'tok'),
			'https://meet.zaur.app/group/zaur-abc/?token=tok'
		);
	});

	it('uses the mailbox local-part when no display name is set', () => {
		assert.equal(galeneDisplayName({ username: 'ada@zaur.app' }), 'ada');
		assert.equal(
			galeneDisplayName({ username: 'ada@zaur.app', displayName: 'Ada Lovelace' }),
			'Ada Lovelace'
		);
	});

	it('creates the group then mints a named operator token', async () => {
		const calls: { url: string; init: RequestInit }[] = [];
		const fetchFn: typeof fetch = async (input, init) => {
			const url = String(input);
			calls.push({ url, init: init ?? {} });
			if (url.endsWith('/.groups/zaur-room')) {
				return new Response(null, { status: 412 });
			}
			if (url.endsWith('/.wildcard-user')) {
				return init?.method === 'GET'
					? new Response(null, { status: 404 })
					: new Response(null, { status: 201 });
			}
			if (url.endsWith('/.password')) {
				return new Response(null, { status: 204 });
			}
			return new Response(null, { status: 201, headers: { location: 'N3Vgwp8PHns' } });
		};

		const join = await mintJoinUrl(config, 'zaur-room', { username: 'Ada', operator: true }, fetchFn);
		assert.equal(join, 'https://meet.zaur.app/group/zaur-room/?token=N3Vgwp8PHns');
		assert.equal(calls[0]?.init.method, 'PUT');
		assert.equal((calls[0]?.init.headers as Record<string, string>)['If-None-Match'], '*');
		const tokenCall = calls.find((call) => String(call.url).endsWith('/.tokens/'));
		assert.equal(tokenCall?.init.method, 'POST');
		const body = JSON.parse(String(tokenCall?.init.body));
		assert.equal(body.username, 'Ada');
		assert.deepEqual(body.permissions, ['op', 'present', 'message', 'caption', 'token']);
	});

	it('opens an existing group so anyone with the link can join', async () => {
		const calls: { url: string; method?: string; body?: string }[] = [];
		const fetchFn: typeof fetch = async (input, init) => {
			const url = String(input);
			calls.push({
				url,
				method: init?.method ?? 'GET',
				body: typeof init?.body === 'string' ? init.body : undefined
			});
			if (url.endsWith('/.groups/zaur-room')) {
				if ((init?.method ?? 'GET') === 'GET') {
					return new Response(
						JSON.stringify({ authPortal: 'https://webmail.zaur.app/meet/zaur-room' }),
						{
							status: 200,
							headers: { etag: '"1"', 'content-type': 'application/json' }
						}
					);
				}
				const headers = init?.headers as Record<string, string> | undefined;
				return new Response(null, {
					status: headers?.['If-None-Match'] === '*' ? 412 : 204
				});
			}
			if (url.endsWith('/.wildcard-user')) {
				return init?.method === 'GET'
					? new Response(null, { status: 404 })
					: new Response(null, { status: 201 });
			}
			if (url.endsWith('/.password')) {
				return new Response(null, { status: 204 });
			}
			return new Response(null, { status: 204 });
		};
		await ensureGroup(config, 'zaur-room', fetchFn);
		const groupPuts = calls.filter(
			(call) => call.url.endsWith('/.groups/zaur-room') && call.method === 'PUT'
		);
		assert.equal(groupPuts[0]?.body, JSON.stringify({ 'unrestricted-tokens': true }));
		assert.equal(groupPuts[1]?.body, JSON.stringify({ 'unrestricted-tokens': true }));
		assert.equal(
			calls.find((call) => call.url.endsWith('/.wildcard-user') && call.method === 'PUT')?.body,
			JSON.stringify({ permissions: 'present' })
		);
		assert.equal(
			calls.find((call) => call.url.endsWith('/.password'))?.body,
			JSON.stringify({ type: 'wildcard' })
		);
	});

	it('parses a token out of a Location path', async () => {
		assert.equal(tokenFromLocation('N3Vgwp8PHns'), 'N3Vgwp8PHns');
		assert.equal(
			tokenFromLocation('/galene-api/v0/.groups/zaur-room/.tokens/abc_12'),
			'abc_12'
		);
		const fetchFn: typeof fetch = async () =>
			new Response(null, {
				status: 201,
				headers: { location: '/galene-api/v0/.groups/zaur-room/.tokens/abc_12' }
			});
		assert.equal(await createInviteToken(config, 'zaur-room', {}, fetchFn), 'abc_12');
	});
});
