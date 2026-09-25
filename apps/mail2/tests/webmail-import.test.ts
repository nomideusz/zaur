import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WEBMAIL_SETTINGS_SUBJECT, webmailSignature } from '../src/lib/server/webmail-import.ts';

const email = (id: string, settings: Record<string, string>, updatedAt: string, keywords: Record<string, true> = {}) => ({
	id,
	subject: WEBMAIL_SETTINGS_SUBJECT,
	keywords,
	receivedAt: updatedAt,
	bodyValues: { '1': { value: JSON.stringify({ version: 2, updatedAt, settings }), isEncodingProblem: false, isTruncated: false } }
});

test('webmail import: the newest blob wins, keys match the address case-insensitively', () => {
	const old = email('e1', { 'zaur:signature:ann@zaur.app': 'Old' }, '2026-01-01T00:00:00Z');
	const fresh = email('e2', { 'zaur:signature:Ann@Zaur.app': ' Ann\nZaur \n' }, '2026-06-01T00:00:00Z');
	assert.deepEqual(webmailSignature([fresh, old], 'ann@zaur.app'), { emailId: 'e2', signature: 'Ann\nZaur' });
});

test('webmail import: switched off, missing, or already imported', () => {
	const off = email('e1', { 'zaur:signature:ann@zaur.app': 'Ann', 'zaur:use-signature:ann@zaur.app': 'false' }, '2026-01-01');
	assert.deepEqual(webmailSignature([off], 'ann@zaur.app'), { emailId: 'e1', signature: '' });
	assert.deepEqual(webmailSignature([email('e1', {}, '2026-01-01')], 'ann@zaur.app'), { emailId: 'e1', signature: '' });
	const done = email('e1', { 'zaur:signature:ann@zaur.app': 'Ann' }, '2026-01-01', { '$zaur-mail2-imported': true });
	assert.equal(webmailSignature([done], 'ann@zaur.app'), null);
	assert.equal(webmailSignature([], 'ann@zaur.app'), null);
});

test('webmail import: other subjects and broken bodies are ignored', () => {
	const fwd = { ...email('e1', { 'zaur:signature:ann@zaur.app': 'Ann' }, '2026-01-01'), subject: `Fwd: ${WEBMAIL_SETTINGS_SUBJECT}` };
	const broken = { ...email('e2', {}, '2026-01-01'), bodyValues: { '1': { value: '{nope', isEncodingProblem: false, isTruncated: false } } };
	assert.equal(webmailSignature([fwd, broken], 'ann@zaur.app'), null);
});
