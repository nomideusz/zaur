import { test } from 'node:test';
import assert from 'node:assert/strict';

import { deviceProblem, fitGrid, formatElapsed, hereLine, rosterOrder } from '../src/lib/meet/call.ts';
import { cleanName, meetConfig, mintJoinToken, normalizeWsUrl } from '../src/lib/server/meet.ts';

test('fitGrid: picks the column count that makes tiles largest, within the box', () => {
	// Four people on a wide stage: 2×2 beats 4×1 and 1×4.
	const four = fitGrid(4, 1146, 528);
	assert.equal(four.cols, 2);
	assert.ok(four.w * 2 + 12 <= 1146 && four.h * 2 + 12 <= 528);
	// Three on a wide, short stage go side by side.
	assert.equal(fitGrid(3, 1400, 400).cols, 3);
	// A tall phone stacks them.
	assert.equal(fitGrid(2, 360, 700).cols, 1);
	// Tiles keep the aspect.
	assert.equal(four.h, Math.floor(four.w / 1.6));
});

test('rosterOrder: you, then hands in the order they went up, then names', () => {
	const people = [
		{ isLocal: false, name: 'Zed', handSince: null },
		{ isLocal: false, name: 'Marek', handSince: 200 },
		{ isLocal: false, name: 'Annie', handSince: null },
		{ isLocal: true, name: 'Zofia', handSince: null },
		{ isLocal: false, name: 'Joanna', handSince: 100 }
	];
	assert.deepEqual(
		rosterOrder(people).map((p) => p.name),
		['Zofia', 'Joanna', 'Marek', 'Annie', 'Zed']
	);
});

test('hereLine: first names, and a count past two', () => {
	assert.equal(hereLine([]), 'No one else is here yet');
	assert.equal(hereLine(['Annie Hobday']), 'Annie is here');
	assert.equal(hereLine(['Annie Hobday', 'Marek Lis']), 'Annie and Marek are here');
	assert.equal(hereLine(['Annie', 'Marek', 'Joanna']), 'Annie, Marek and 1 other are here');
	assert.equal(hereLine(['Annie', 'Marek', 'Joanna', 'Zofia']), 'Annie, Marek and 2 others are here');
});

test('formatElapsed: minutes and seconds, hours only once there are some', () => {
	assert.equal(formatElapsed(0), '00:00');
	assert.equal(formatElapsed(252_000), '04:12');
	assert.equal(formatElapsed(3_852_000), '1:04:12');
	assert.equal(formatElapsed(-5), '00:00');
});

test('deviceProblem: says what to fix', () => {
	const err = (name: string) => Object.assign(new Error('x'), { name });
	assert.equal(deviceProblem(err('NotAllowedError'), 'camera'), 'Your browser blocked the camera');
	assert.equal(deviceProblem(err('NotFoundError'), 'microphone'), 'No microphone found');
	assert.equal(deviceProblem(err('NotReadableError'), 'camera'), 'The camera is in use by another app');
	assert.equal(deviceProblem(null, 'camera'), 'Could not start the camera');
});

test('normalizeWsUrl: https becomes wss, bare hosts get wss, other schemes are refused', () => {
	assert.equal(normalizeWsUrl('https://x.livekit.cloud/'), 'wss://x.livekit.cloud');
	assert.equal(normalizeWsUrl('http://localhost:7880'), 'ws://localhost:7880');
	assert.equal(normalizeWsUrl('x.livekit.cloud'), 'wss://x.livekit.cloud');
	assert.equal(normalizeWsUrl('ftp://x'), '');
	assert.equal(normalizeWsUrl(''), '');
});

test('meetConfig: all three variables, or Meet is off', () => {
	const full = { LIVEKIT_URL: 'wss://x.livekit.cloud', LIVEKIT_API_KEY: 'k', LIVEKIT_API_SECRET: 's' };
	assert.deepEqual(meetConfig(full), { wsUrl: 'wss://x.livekit.cloud', apiKey: 'k', apiSecret: 's' });
	assert.equal(meetConfig({ ...full, LIVEKIT_API_SECRET: ' ' }), null);
	assert.equal(meetConfig({ ...full, LIVEKIT_URL: undefined }), null);
});

test('cleanName: no control characters or slashes, 64 at most', () => {
	assert.equal(cleanName('  Joanna\u0000 W/r\\ona\n '), 'Joanna Wrona');
	assert.equal(cleanName('x'.repeat(100)).length, 64);
});

test('mintJoinToken: one room, no admin, may set its own hand', async () => {
	const token = await mintJoinToken(
		{ wsUrl: 'wss://x', apiKey: 'key', apiSecret: 'a-secret-long-enough-for-hs256-signing' },
		{ room: 'zaur-abc123', identity: 'guest-1', name: 'Joanna' }
	);
	const payload = JSON.parse(Buffer.from(token.split('.')[1]!, 'base64url').toString());
	assert.equal(payload.sub, 'guest-1');
	assert.equal(payload.name, 'Joanna');
	assert.deepEqual(payload.video, {
		room: 'zaur-abc123',
		roomJoin: true,
		canPublish: true,
		canSubscribe: true,
		canPublishData: true,
		canUpdateOwnMetadata: true
	});
	assert.equal(payload.exp - payload.nbf, 12 * 3600);
});
