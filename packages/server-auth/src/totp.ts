/**
 * TOTP (RFC 6238) over HMAC-SHA1, the profile every authenticator app speaks.
 *
 * Stalwart never hands a TOTP secret back (`x:AccountPassword/get` masks
 * `otpAuth.otpUrl`), so the client mints the secret, shows the QR, and sends
 * the `otpauth://` URL up when the person confirms. That makes this the only
 * place a wrong secret could slip through — which is why the confirmation code
 * is verified *here*, against the pending secret, before anything is stored:
 * Stalwart does not require a code to enable, and a person locked out by a
 * mistyped secret is the one failure this feature must not have.
 *
 * Pure: no I/O, unit-tested in plain node.
 */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export const TOTP_DIGITS = 6;
export const TOTP_PERIOD_SEC = 30;

export function base32Encode(buffer: Uint8Array): string {
	let bits = '';
	for (const byte of buffer) bits += byte.toString(2).padStart(8, '0');
	let out = '';
	for (let i = 0; i < bits.length; i += 5) {
		out += BASE32_ALPHABET[Number.parseInt(bits.slice(i, i + 5).padEnd(5, '0'), 2)];
	}
	return out;
}

export function base32Decode(text: string): Uint8Array {
	const clean = text.toUpperCase().replace(/[^A-Z2-7]/g, '');
	let bits = '';
	for (const char of clean) {
		bits += BASE32_ALPHABET.indexOf(char).toString(2).padStart(5, '0');
	}
	const bytes: number[] = [];
	for (let i = 0; i + 8 <= bits.length; i += 8) {
		bytes.push(Number.parseInt(bits.slice(i, i + 8), 2));
	}
	return Uint8Array.from(bytes);
}

/** 160-bit secret, the size RFC 4226 recommends for SHA-1. */
export function generateTotpSecret(): string {
	return base32Encode(randomBytes(20));
}

export function buildOtpAuthUrl(input: {
	issuer: string;
	account: string;
	secret: string;
}): string {
	const issuer = encodeURIComponent(input.issuer);
	const label = `${issuer}:${encodeURIComponent(input.account)}`;
	return `otpauth://totp/${label}?secret=${input.secret}&issuer=${issuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD_SEC}`;
}

/** The code an authenticator shows for `secret` at `nowMs` (RFC 6238 §4). */
export function totpCode(
	secret: string,
	nowMs = Date.now(),
	period = TOTP_PERIOD_SEC,
	digits = TOTP_DIGITS
): string {
	const counter = Math.floor(nowMs / 1000 / period);
	const message = Buffer.alloc(8);
	message.writeBigUInt64BE(BigInt(counter));
	const digest = createHmac('sha1', Buffer.from(base32Decode(secret))).update(message).digest();
	const offset = digest[digest.length - 1]! & 0x0f;
	const binary =
		((digest[offset]! & 0x7f) << 24) |
		((digest[offset + 1]! & 0xff) << 16) |
		((digest[offset + 2]! & 0xff) << 8) |
		(digest[offset + 3]! & 0xff);
	return String(binary % 10 ** digits).padStart(digits, '0');
}

/**
 * Accept the current step and one on either side — a phone's clock and the
 * server's rarely agree to the second, and a person typing at the end of a
 * window should not be told they were wrong.
 */
export function verifyTotpCode(
	secret: string,
	code: string,
	nowMs = Date.now(),
	window = 1
): boolean {
	const candidate = code.replace(/\s+/g, '');
	if (!/^\d{6}$/.test(candidate)) return false;
	const given = Buffer.from(candidate);
	for (let step = -window; step <= window; step++) {
		const expected = Buffer.from(totpCode(secret, nowMs + step * TOTP_PERIOD_SEC * 1000));
		if (expected.length === given.length && timingSafeEqual(expected, given)) return true;
	}
	return false;
}
