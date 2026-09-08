import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { safeNextPath, verifyInternalSignature } from '../src/lib/server/internal-auth.ts';
import { consumeOneTimeCode, createOneTimeCode } from '../src/lib/server/oidc/core.ts';

// Signature exactly as apps/register/lib/webmail-handoff.js produces it.
function registerSign(secret: string, ts: string, nonce: string, method: string, path: string, body: string) {
	const bodyHash = createHash('sha256').update(body).digest('hex');
	return createHmac('sha256', secret).update(`${ts}.${nonce}.${method}.${path}.${bodyHash}`).digest('hex');
}

describe('verifyInternalSignature', () => {
	const secret = 'shared-secret';
	const now = 1_700_000_000_000;
	const nonce = 'abcdefghijklmnop';
	const body = '{"email":"a@b.c"}';
	const base = { secret, nonce, method: 'POST', pathWithQuery: '/api/internal/handoff', body, now };

	it('accepts a signature made the register way', () => {
		const ts = String(now - 1000);
		const signature = registerSign(secret, ts, nonce, 'POST', '/api/internal/handoff', body);
		assert.equal(verifyInternalSignature({ ...base, timestamp: ts, signature }), true);
	});

	it('rejects a tampered body, a stale timestamp, and a wrong secret', () => {
		const ts = String(now);
		const signature = registerSign(secret, ts, nonce, 'POST', '/api/internal/handoff', body);
		assert.equal(verifyInternalSignature({ ...base, timestamp: ts, signature, body: body + ' ' }), false);
		const stale = String(now - 6 * 60_000);
		const staleSig = registerSign(secret, stale, nonce, 'POST', '/api/internal/handoff', body);
		assert.equal(verifyInternalSignature({ ...base, timestamp: stale, signature: staleSig }), false);
		assert.equal(verifyInternalSignature({ ...base, timestamp: ts, signature, secret: 'other' }), false);
		assert.equal(verifyInternalSignature({ ...base, timestamp: ts, signature, secret: undefined }), false);
	});
});

describe('safeNextPath', () => {
	it('allows same-origin relative paths only', () => {
		assert.equal(safeNextPath('/oidc/authorize?client_id=x'), '/oidc/authorize?client_id=x');
		assert.equal(safeNextPath('//evil.example'), undefined);
		assert.equal(safeNextPath('https://evil.example/'), undefined);
		assert.equal(safeNextPath(42), undefined);
	});
});

describe('one-time codes', () => {
	it('round-trips a payload once and never again', () => {
		const db = new DatabaseSync(':memory:');
		const code = createOneTimeCode(db, { sealed: 'x', next: '/mail' }, 60_000, 1000);
		assert.deepEqual(consumeOneTimeCode(db, code, 2000), { sealed: 'x', next: '/mail' });
		assert.equal(consumeOneTimeCode(db, code, 2000), null);
		const expired = createOneTimeCode(db, { sealed: 'y' }, 10, 1000);
		assert.equal(consumeOneTimeCode(db, expired, 5000), null);
	});
});
