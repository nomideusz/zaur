import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	createJitsiMeetingUrl,
	extractJitsiMeetingUrl,
	isJitsiConfigured,
	isJitsiMeetingUrl,
	normalizeJitsiBaseUrl
} from '../src/lib/utils/jitsi.ts';

describe('jitsi helpers', () => {
	it('normalizes base URLs', () => {
		assert.equal(normalizeJitsiBaseUrl('https://meet.zaur.app/'), 'https://meet.zaur.app');
		assert.equal(normalizeJitsiBaseUrl('meet.zaur.app'), 'https://meet.zaur.app');
		assert.equal(normalizeJitsiBaseUrl('  '), '');
		assert.equal(normalizeJitsiBaseUrl('ftp://meet.zaur.app'), '');
	});

	it('detects configuration', () => {
		assert.equal(isJitsiConfigured('https://meet.zaur.app'), true);
		assert.equal(isJitsiConfigured(''), false);
		assert.equal(isJitsiConfigured(undefined), false);
	});

	it('recognizes meeting URLs on the configured host', () => {
		const base = 'https://meet.zaur.app';
		assert.equal(isJitsiMeetingUrl('https://meet.zaur.app/zaur-abc123', base), true);
		assert.equal(isJitsiMeetingUrl('https://meet.zaur.app/zaur-abc123/', base), true);
		assert.equal(isJitsiMeetingUrl('https://meet.jit.si/zaur-abc123', base), false);
		assert.equal(isJitsiMeetingUrl('https://meet.zaur.app/', base), false);
		assert.equal(isJitsiMeetingUrl('Studio A', base), false);
	});

	it('extracts a meeting URL from plain location text', () => {
		const base = 'https://meet.zaur.app';
		assert.equal(
			extractJitsiMeetingUrl('https://meet.zaur.app/zaur-room1', base),
			'https://meet.zaur.app/zaur-room1'
		);
		assert.equal(
			extractJitsiMeetingUrl('Join at https://meet.zaur.app/zaur-room1 please', base),
			'https://meet.zaur.app/zaur-room1'
		);
		assert.equal(extractJitsiMeetingUrl('Studio A', base), null);
	});

	it('creates a room URL under the base host', () => {
		const url = createJitsiMeetingUrl('https://meet.zaur.app/');
		assert.match(url, /^https:\/\/meet\.zaur\.app\/zaur-[a-z0-9]{12}$/);
		assert.equal(isJitsiMeetingUrl(url, 'https://meet.zaur.app'), true);
	});
});
