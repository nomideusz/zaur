import { test } from 'node:test';
import assert from 'node:assert/strict';

import { describeUserAgent, relativeTime } from '../src/lib/settings/devices.ts';

test('describeUserAgent names browser and platform for common agents', () => {
	assert.equal(
		describeUserAgent(
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36 Edg/128.0'
		),
		'Edge on Windows'
	);
	assert.equal(
		describeUserAgent(
			'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15'
		),
		'Safari on macOS'
	);
	assert.equal(
		describeUserAgent('Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0'),
		'Firefox on Linux'
	);
	assert.equal(
		describeUserAgent(
			'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/128.0 Mobile/15E148 Safari/604.1'
		),
		'Chrome on iOS'
	);
});

test('describeUserAgent degrades to what it can name', () => {
	assert.equal(describeUserAgent(null), 'Unknown device');
	assert.equal(describeUserAgent(''), 'Unknown device');
	assert.equal(describeUserAgent('curl/8.4.0'), 'curl');
	assert.equal(describeUserAgent('Mozilla/5.0 (Android 14; Mobile)'), 'Browser on Android');
});

test('relativeTime picks the coarsest unit that still says something', () => {
	const now = 1_700_000_000_000;
	assert.equal(relativeTime(now - 5_000, now), 'just now');
	assert.equal(relativeTime(now - 3 * 60_000, now), '3 min ago');
	assert.equal(relativeTime(now - 2 * 3_600_000, now), '2 h ago');
	assert.equal(relativeTime(now - 30 * 3_600_000, now), 'yesterday');
	assert.equal(relativeTime(now - 5 * 86_400_000, now), '5 days ago');
	assert.match(relativeTime(now - 90 * 86_400_000, now), /\d{4}/);
});
