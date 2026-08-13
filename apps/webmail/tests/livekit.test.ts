import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	livekitConfigFromEnv,
	livekitDisplayName,
	mintJoinToken,
	normalizeWsUrl
} from '../src/lib/server/livekit.ts';

describe('livekit admin client', () => {
	it('reads config from env and ignores incomplete credentials', () => {
		assert.deepEqual(
			livekitConfigFromEnv({
				LIVEKIT_URL: 'https://szkoly-jogi-dx3sxlnn.livekit.cloud/',
				LIVEKIT_API_KEY: 'APItest',
				LIVEKIT_API_SECRET: 'secret-secret-secret-secret-secret'
			}),
			{
				wsUrl: 'wss://szkoly-jogi-dx3sxlnn.livekit.cloud',
				apiKey: 'APItest',
				apiSecret: 'secret-secret-secret-secret-secret'
			}
		);
		assert.equal(livekitConfigFromEnv({ LIVEKIT_API_KEY: 'APItest' }), null);
		assert.equal(
			livekitConfigFromEnv({
				LIVEKIT_URL: 'wss://example.livekit.cloud',
				LIVEKIT_API_KEY: '',
				LIVEKIT_API_SECRET: 'secret'
			}),
			null
		);
	});

	it('normalizes websocket URLs', () => {
		assert.equal(normalizeWsUrl('wss://x.livekit.cloud/'), 'wss://x.livekit.cloud');
		assert.equal(normalizeWsUrl('https://x.livekit.cloud'), 'wss://x.livekit.cloud');
		assert.equal(normalizeWsUrl('x.livekit.cloud'), 'wss://x.livekit.cloud');
		assert.equal(normalizeWsUrl('ftp://x.livekit.cloud'), '');
	});

	it('uses the mailbox local-part when no display name is set', () => {
		assert.equal(livekitDisplayName({ username: 'ada@zaur.app' }), 'ada');
		assert.equal(
			livekitDisplayName({ username: 'ada@zaur.app', displayName: 'Ada Lovelace' }),
			'Ada Lovelace'
		);
	});

	it('mints a room-join JWT', async () => {
		const token = await mintJoinToken(
			{
				wsUrl: 'wss://example.livekit.cloud',
				apiKey: 'APItestkey12',
				apiSecret: 'secret-secret-secret-secret-secret12'
			},
			{ room: 'zaur-room', identity: 'ada@zaur.app', name: 'Ada' }
		);
		const payload = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString());
		assert.equal(payload.sub, 'ada@zaur.app');
		assert.equal(payload.name, 'Ada');
		assert.equal(payload.video.room, 'zaur-room');
		assert.equal(payload.video.roomJoin, true);
		assert.equal(payload.video.canPublish, true);
	});
});
