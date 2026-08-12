import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	createMeetingUrl,
	extractMeetingGroup,
	isMeetConfigured,
	isMeetGroupId,
	isMeetingUrl,
	meetingJoinPath,
	normalizeMeetBaseUrl
} from '../src/lib/utils/meet.ts';

describe('meet helpers', () => {
	it('normalizes base URLs', () => {
		assert.equal(normalizeMeetBaseUrl('https://meet.zaur.app/'), 'https://meet.zaur.app');
		assert.equal(normalizeMeetBaseUrl('meet.zaur.app'), 'https://meet.zaur.app');
		assert.equal(normalizeMeetBaseUrl('  '), '');
		assert.equal(normalizeMeetBaseUrl('ftp://meet.zaur.app'), '');
	});

	it('detects configuration', () => {
		assert.equal(isMeetConfigured('https://meet.zaur.app'), true);
		assert.equal(isMeetConfigured(''), false);
		assert.equal(isMeetConfigured(undefined), false);
	});

	it('accepts Galene group ids and rejects path tricks', () => {
		assert.equal(isMeetGroupId('zaur-abc123def456'), true);
		assert.equal(isMeetGroupId('zaur-room1'), true);
		assert.equal(isMeetGroupId('a'), true);
		assert.equal(isMeetGroupId('../etc'), false);
		assert.equal(isMeetGroupId('a/b'), false);
		assert.equal(isMeetGroupId(''), false);
	});

	it('recognizes webmail join URLs and Galene group URLs', () => {
		const galene = 'https://meet.zaur.app';
		assert.equal(isMeetingUrl('https://webmail.zaur.app/meet/zaur-abc123def456', galene), true);
		assert.equal(isMeetingUrl('https://webmail.zaur.app/meet/zaur-abc123def456/', galene), true);
		assert.equal(isMeetingUrl('https://meet.zaur.app/group/zaur-abc123def456/', galene), true);
		assert.equal(isMeetingUrl('https://meet.zaur.app/group/zaur-abc123def456', galene), true);
		assert.equal(isMeetingUrl('https://meet.jit.si/zaur-abc123', galene), false);
		assert.equal(isMeetingUrl('https://meet.zaur.app/', galene), false);
		assert.equal(isMeetingUrl('Studio A', galene), false);
	});

	it('extracts a group id from plain location text', () => {
		const galene = 'https://meet.zaur.app';
		assert.equal(
			extractMeetingGroup('https://webmail.zaur.app/meet/zaur-room1', galene),
			'zaur-room1'
		);
		assert.equal(
			extractMeetingGroup('Join at https://webmail.zaur.app/meet/zaur-room1 please', galene),
			'zaur-room1'
		);
		assert.equal(
			extractMeetingGroup('https://meet.zaur.app/group/zaur-room1/', galene),
			'zaur-room1'
		);
		assert.equal(extractMeetingGroup('Studio A', galene), null);
	});

	it('creates a same-origin join URL', () => {
		const url = createMeetingUrl('https://webmail.zaur.app/');
		assert.match(url, /^https:\/\/webmail\.zaur\.app\/meet\/zaur-[a-z0-9]{12}$/);
		assert.equal(isMeetingUrl(url, 'https://meet.zaur.app'), true);
		const group = extractMeetingGroup(url, 'https://meet.zaur.app');
		assert.ok(group);
		assert.equal(meetingJoinPath(group), `/meet/${group}`);
	});
});
