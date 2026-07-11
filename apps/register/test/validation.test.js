const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');

const { verifyForwardedClientIp } = require('../lib/validation');

const SECRET = 'test-shared-secret';
const sign = (ip) => crypto.createHmac('sha256', SECRET).update(ip).digest('hex');

test('verifyForwardedClientIp accepts a correctly signed IP', () => {
  assert.equal(verifyForwardedClientIp('203.0.113.7', sign('203.0.113.7'), SECRET), true);
});

test('verifyForwardedClientIp rejects a signature for a different IP', () => {
  assert.equal(verifyForwardedClientIp('203.0.113.8', sign('203.0.113.7'), SECRET), false);
});

test('verifyForwardedClientIp rejects garbage and missing inputs', () => {
  assert.equal(verifyForwardedClientIp('203.0.113.7', 'not-a-signature', SECRET), false);
  assert.equal(verifyForwardedClientIp('', sign(''), SECRET), false);
  assert.equal(verifyForwardedClientIp('203.0.113.7', sign('203.0.113.7'), undefined), false);
  assert.equal(verifyForwardedClientIp('x'.repeat(65), sign('x'.repeat(65)), SECRET), false);
});
