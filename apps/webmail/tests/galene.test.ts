import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	createInviteToken,
	ensureGroup,
	galeneConfigFromEnv,
	galeneDisplayName,
	galeneJoinUrl,
	mintJoinUrl
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
		assert.equal(galeneDisplayName({ username: 'ada@zaur.app', displayName: 'Ada Lovelace' }), 'Ada Lovelace');
	});

	it('creates the group then mints a named operator token', async () => {
		const calls: { url: string; init: RequestInit }[] = [];
		const fetchFn: typeof fetch = async (input, init) => {
			const url = String(input);
			calls.push({ url, init: init ?? {} });
			if (url.endsWith('/.groups/zaur-room')) {
				return new Response(null, { status: 412 });
			}
			return new Response(null, { status: 201, headers: { location: 'N3Vgwp8PHns' } });
		};

		const join = await mintJoinUrl(
			config,
			'zaur-room',
			{ username: 'Ada', operator: true },
			fetchFn
		);
		assert.equal(join, 'https://meet.zaur.app/group/zaur-room/?token=N3Vgwp8PHns');
		assert.equal(calls.length, 2);
		assert.equal(calls[0].init.method, 'PUT');
		assert.equal((calls[0].init.headers as Record<string, string>)['If-None-Match'], '*');
		assert.equal(calls[1].init.method, 'POST');
		assert.match(String(calls[1].url), /\/\.tokens\/$/);
		const body = JSON.parse(String(calls[1].init.body));
		assert.equal(body.username, 'Ada');
		assert.deepEqual(body.permissions, ['op']);
	});

	it('treats an existing group as success', async () => {
		const fetchFn: typeof fetch = async () => new Response(null, { status: 412 });
		await ensureGroup(config, 'zaur-room', fetchFn);
	});

	it('parses a token out of a Location path', async () => {
		const fetchFn: typeof fetch = async () =>
			new Response(null, {
				status: 201,
				headers: { location: '/galene-api/v0/.groups/zaur-room/.tokens/abc_12' }
			});
		assert.equal(await createInviteToken(config, 'zaur-room', {}, fetchFn), 'abc_12');
	});
});
