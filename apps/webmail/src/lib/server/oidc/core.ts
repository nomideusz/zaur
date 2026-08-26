/**
 * Minimal OIDC provider core: RS256 keypair, id_token signing, one-time
 * authorization codes, and PKCE verification. Pure node (no SvelteKit imports)
 * so `node --test` can exercise it against an in-memory DatabaseSync — the
 * same split as `store-db.ts`. Env wiring and the Stalwart identity lookup
 * live in `./index.ts`; the HTTP surface lives in `src/routes/oidc/*`.
 *
 * Deliberately supports exactly what our relying parties need: authorization
 * code flow with mandatory PKCE (S256), one static client, RS256 id_tokens.
 */
import {
	createPublicKey,
	createSign,
	createHash,
	generateKeyPairSync,
	randomBytes,
	timingSafeEqual
} from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';

export interface OidcKeypair {
	kid: string;
	privatePem: string;
	publicPem: string;
}

export interface AuthCodeData {
	clientId: string;
	redirectUri: string;
	codeChallenge: string;
	nonce?: string;
	claims: { sub: string; preferred_username: string; email: string };
}

const b64u = (input: Buffer | string): string => Buffer.from(input).toString('base64url');

function ensureTables(db: DatabaseSync): void {
	db.exec(`
		CREATE TABLE IF NOT EXISTS oidc_keys (
			kid TEXT PRIMARY KEY,
			private_pem TEXT NOT NULL,
			public_pem TEXT NOT NULL,
			created_at INTEGER NOT NULL
		);
		CREATE TABLE IF NOT EXISTS oidc_codes (
			code TEXT PRIMARY KEY,
			payload TEXT NOT NULL,
			expires_at INTEGER NOT NULL
		);
	`);
}

/** Load the signing keypair, generating and persisting one on first use. */
export function getOrCreateKeypair(db: DatabaseSync): OidcKeypair {
	ensureTables(db);
	const row = db.prepare('SELECT kid, private_pem, public_pem FROM oidc_keys LIMIT 1').get() as
		| { kid: string; private_pem: string; public_pem: string }
		| undefined;
	if (row) return { kid: row.kid, privatePem: row.private_pem, publicPem: row.public_pem };

	const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
	const keypair: OidcKeypair = {
		kid: randomBytes(8).toString('hex'),
		privatePem: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
		publicPem: publicKey.export({ type: 'spki', format: 'pem' }).toString()
	};
	db.prepare('INSERT INTO oidc_keys (kid, private_pem, public_pem, created_at) VALUES (?, ?, ?, ?)').run(
		keypair.kid,
		keypair.privatePem,
		keypair.publicPem,
		Date.now()
	);
	return keypair;
}

export function publicJwks(keypair: OidcKeypair): { keys: Record<string, unknown>[] } {
	const jwk = createPublicKey(keypair.publicPem).export({ format: 'jwk' });
	return { keys: [{ ...jwk, kid: keypair.kid, alg: 'RS256', use: 'sig' }] };
}

export function signIdToken(keypair: OidcKeypair, claims: Record<string, unknown>): string {
	const header = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: keypair.kid }));
	const payload = b64u(JSON.stringify(claims));
	const signature = createSign('RSA-SHA256')
		.update(`${header}.${payload}`)
		.sign(keypair.privatePem)
		.toString('base64url');
	return `${header}.${payload}.${signature}`;
}

export function createAuthCode(db: DatabaseSync, data: AuthCodeData, ttlMs: number, now = Date.now()): string {
	ensureTables(db);
	db.prepare('DELETE FROM oidc_codes WHERE expires_at < ?').run(now);
	const code = randomBytes(32).toString('base64url');
	db.prepare('INSERT INTO oidc_codes (code, payload, expires_at) VALUES (?, ?, ?)').run(
		code,
		JSON.stringify(data),
		now + ttlMs
	);
	return code;
}

/** One-time: the code row is deleted whether or not it is still valid. */
export function consumeAuthCode(db: DatabaseSync, code: string, now = Date.now()): AuthCodeData | null {
	ensureTables(db);
	const row = db.prepare('SELECT payload, expires_at FROM oidc_codes WHERE code = ?').get(code) as
		| { payload: string; expires_at: number }
		| undefined;
	if (row) db.prepare('DELETE FROM oidc_codes WHERE code = ?').run(code);
	if (!row || row.expires_at < now) return null;
	return JSON.parse(row.payload) as AuthCodeData;
}

export function verifyPkceS256(verifier: string, challenge: string): boolean {
	if (!verifier || !challenge) return false;
	const computed = Buffer.from(createHash('sha256').update(verifier).digest('base64url'));
	const expected = Buffer.from(challenge);
	return computed.length === expected.length && timingSafeEqual(computed, expected);
}

export function secretsEqual(a: string, b: string): boolean {
	const ba = Buffer.from(a);
	const bb = Buffer.from(b);
	return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function discoveryDocument(origin: string): Record<string, unknown> {
	return {
		issuer: origin,
		authorization_endpoint: `${origin}/oidc/authorize`,
		token_endpoint: `${origin}/oidc/token`,
		jwks_uri: `${origin}/oidc/jwks`,
		response_types_supported: ['code'],
		grant_types_supported: ['authorization_code'],
		subject_types_supported: ['public'],
		id_token_signing_alg_values_supported: ['RS256'],
		scopes_supported: ['openid'],
		token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
		code_challenge_methods_supported: ['S256'],
		claims_supported: ['sub', 'preferred_username', 'email']
	};
}
