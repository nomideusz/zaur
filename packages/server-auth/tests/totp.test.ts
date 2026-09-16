import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
	base32Decode,
	base32Encode,
	buildOtpAuthUrl,
	generateTotpSecret,
	totpCode,
	verifyTotpCode
} from '../src/totp.ts';

// RFC 6238 Appendix B test vectors (SHA-1, 8 digits truncated to the last 6
// would differ, so the 6-digit codes below were derived from the same seed).
const RFC_SEED = base32Encode(Buffer.from('12345678901234567890'));

test('totpCode matches the RFC 6238 reference vectors for SHA-1', () => {
	// T = 59s → counter 1; the RFC's 8-digit code is 94287082.
	assert.equal(totpCode(RFC_SEED, 59_000, 30, 8), '94287082');
	assert.equal(totpCode(RFC_SEED, 1_111_111_109_000, 30, 8), '07081804');
	assert.equal(totpCode(RFC_SEED, 1_234_567_890_000, 30, 8), '89005924');
	// The six-digit profile is the same code with the two leading digits gone.
	assert.equal(totpCode(RFC_SEED, 59_000), '287082');
});

test('base32 round-trips arbitrary bytes', () => {
	const bytes = Uint8Array.from([0, 1, 2, 250, 251, 252, 253, 254, 255, 42]);
	assert.deepEqual([...base32Decode(base32Encode(bytes))], [...bytes]);
	assert.equal(base32Encode(Buffer.from('foobar')), 'MZXW6YTBOI');
});

test('generateTotpSecret yields a 32-character base32 string (160 bits)', () => {
	const secret = generateTotpSecret();
	assert.match(secret, /^[A-Z2-7]{32}$/);
	assert.notEqual(secret, generateTotpSecret());
});

test('verifyTotpCode accepts the neighbouring steps and nothing else', () => {
	const now = 1_700_000_000_000;
	const secret = generateTotpSecret();
	assert.equal(verifyTotpCode(secret, totpCode(secret, now), now), true);
	assert.equal(verifyTotpCode(secret, totpCode(secret, now - 30_000), now), true);
	assert.equal(verifyTotpCode(secret, totpCode(secret, now + 30_000), now), true);
	assert.equal(verifyTotpCode(secret, totpCode(secret, now + 60_000), now), false);
	assert.equal(verifyTotpCode(secret, '12 34 56', now), verifyTotpCode(secret, '123456', now));
	assert.equal(verifyTotpCode(secret, 'abcdef', now), false);
	assert.equal(verifyTotpCode(secret, '', now), false);
});

test('buildOtpAuthUrl labels the account with the issuer and escapes both', () => {
	const url = buildOtpAuthUrl({ issuer: 'Zaur Mail', account: 'ada@zaur.app', secret: 'ABC234' });
	assert.equal(
		url,
		'otpauth://totp/Zaur%20Mail:ada%40zaur.app?secret=ABC234&issuer=Zaur%20Mail&algorithm=SHA1&digits=6&period=30'
	);
});
