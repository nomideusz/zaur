import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FeedError, fetchFeed, feedUrl, isPublicAddress } from '../src/lib/server/feeds.ts';

test('only public addresses are fetched', () => {
	for (const address of ['8.8.8.8', '1.1.1.1', '2606:4700::1111', '::ffff:8.8.8.8']) assert.equal(isPublicAddress(address), true, address);
	for (const address of [
		'127.0.0.1',
		'10.1.2.3',
		'172.20.0.5', // a Docker network
		'192.168.1.1',
		'169.254.169.254', // cloud metadata
		'100.64.0.1',
		'0.0.0.0',
		'::1',
		'::',
		'fd00::1',
		'fe80::1',
		'::ffff:127.0.0.1',
		'::ffff:10.0.0.1',
		'not an address'
	])
		assert.equal(isPublicAddress(address), false, address);
});

test('webcal is https; other schemes, ports, passwords and private literals are refused', () => {
	assert.equal(feedUrl('webcal://p01-calendars.icloud.com/published/2/abc').href, 'https://p01-calendars.icloud.com/published/2/abc');
	assert.equal(feedUrl(' https://calendar.google.com/calendar/ical/x/basic.ics ').protocol, 'https:');
	for (const bad of [
		'http://example.com/a.ics',
		'file:///etc/passwd',
		'https://example.com:8443/a.ics',
		'https://user:pass@example.com/a.ics',
		'https://127.0.0.1/a.ics',
		'https://[::1]/a.ics',
		'https://169.254.169.254/latest/meta-data',
		'nonsense'
	])
		assert.throws(() => feedUrl(bad), FeedError, bad);
});

test('a name that resolves to a private address is refused at connect time', async () => {
	await assert.rejects(fetchFeed('https://localhost/a.ics'), (cause: unknown) => cause instanceof FeedError && /public internet/.test(cause.message));
});
