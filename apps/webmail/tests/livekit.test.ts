import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	livekitConfigFromEnv,
	livekitDisplayName,
	mintJoinToken,
	normalizeWsUrl
} from '../src/lib/server/livekit.ts';
import { isSafariUserAgent } from '../src/lib/utils/meet.ts';

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

describe('safari detection for screen share', () => {
	// Real UA strings — Chromium and Firefox-on-iOS both claim "Safari".
	const SAFARI_MAC =
		'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3 Safari/605.1.15';
	const SAFARI_IOS =
		'Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3 Mobile/15E148 Safari/604.1';
	const CHROME_MAC =
		'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
	const CHROME_ANDROID =
		'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';
	const EDGE =
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0';
	const CHROME_IOS =
		'Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.0.0 Mobile/15E148 Safari/604.1';

	it('matches real WebKit', () => {
		assert.equal(isSafariUserAgent(SAFARI_MAC), true);
		assert.equal(isSafariUserAgent(SAFARI_IOS), true);
	});

	it('rejects every browser that merely carries the Safari token', () => {
		for (const ua of [CHROME_MAC, CHROME_ANDROID, EDGE, CHROME_IOS]) {
			assert.equal(isSafariUserAgent(ua), false, ua);
		}
	});
});
