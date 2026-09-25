// Plays Bartube (an OIDC relying party) and register against `pnpm dev:mail2`
// on :5175, with the fake JMAP server up and the smoke session seeded:
//
//   PUBLIC_JMAP_SERVER_URL=http://127.0.0.1:9911 REGISTER_INTERNAL_SECRET=smoke-secret \
//   OIDC_PROVIDER_CLIENTS='[{"clientId":"bartube","clientSecret":"bt-secret","redirectUris":["http://localhost:9999/cb"],"name":"Bartube"}]' \
//   pnpm dev:mail2
//   node tests/smoke/oidc-rp.mjs
//
// Walks authorize → token → id_token (verified against the JWKS), the signup
// handoff → claim → authorize, and RP-initiated logout, with the refusals on
// each. The seeded session survives it: logout runs on the claimed one.
import { createHash, createHmac, createPublicKey, createVerify, randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';
const B = 'http://localhost:5175';
const COOKIE = 'zaur_session=smoke-session-id-0000000000000000000000000000000000000000000';
const get = (path, headers = {}) => fetch(B + path, { redirect: 'manual', headers });

const disco = await (await get('/.well-known/openid-configuration')).json();
assert.equal(disco.issuer, B);

const verifier = randomBytes(32).toString('base64url');
const challenge = createHash('sha256').update(verifier).digest('base64url');
const q = new URLSearchParams({ client_id: 'bartube', redirect_uri: 'http://localhost:9999/cb', response_type: 'code', scope: 'openid email', state: 'st8', nonce: 'n0', code_challenge: challenge, code_challenge_method: 'S256' });

// Signed out → login with next back here.
let r = await get(`/oidc/authorize?${q}`);
assert.equal(r.status, 302);
assert.match(r.headers.get('location'), /^\/login\?next=%2Foidc%2Fauthorize/);
console.log('signed-out authorize →', r.headers.get('location').slice(0, 60));

// Bad redirect_uri: hard 400, never a redirect.
r = await get(`/oidc/authorize?${new URLSearchParams({ ...Object.fromEntries(q), redirect_uri: 'https://evil.test/cb' })}`, { cookie: COOKIE });
assert.equal(r.status, 400);

// Signed in → code at the RP.
r = await get(`/oidc/authorize?${q}`, { cookie: COOKIE });
assert.equal(r.status, 302);
const back = new URL(r.headers.get('location'));
assert.equal(back.origin + back.pathname, 'http://localhost:9999/cb');
assert.equal(back.searchParams.get('state'), 'st8');
const code = back.searchParams.get('code');

const token = (body, headers = {}) => fetch(B + '/oidc/token', { method: 'POST', body: new URLSearchParams(body), headers });
const basic = { authorization: 'Basic ' + Buffer.from('bartube:bt-secret').toString('base64') };
// Wrong secret, wrong verifier
assert.equal((await token({ grant_type: 'authorization_code', code, redirect_uri: 'http://localhost:9999/cb', code_verifier: verifier, client_id: 'bartube', client_secret: 'nope' })).status, 401);
r = await token({ grant_type: 'authorization_code', code, redirect_uri: 'http://localhost:9999/cb', code_verifier: verifier }, basic);
const tok = await r.json();
assert.equal(r.status, 200, JSON.stringify(tok));
const [h, p, s] = tok.id_token.split('.');
const jwks = await (await get('/oidc/jwks')).json();
const key = createPublicKey({ key: jwks.keys[0], format: 'jwk' });
assert.ok(createVerify('RSA-SHA256').update(`${h}.${p}`).verify(key, Buffer.from(s, 'base64url')));
const claims = JSON.parse(Buffer.from(p, 'base64url'));
assert.equal(claims.aud, 'bartube'); assert.equal(claims.nonce, 'n0'); assert.equal(claims.iss, B);
console.log('id_token claims', claims);
// Code is one-time.
assert.equal((await token({ grant_type: 'authorization_code', code, redirect_uri: 'http://localhost:9999/cb', code_verifier: verifier }, basic)).status, 400);

// Signup handoff, signed like register does.
const body = JSON.stringify({ email: 'smoke@zaur.app', password: 'whatever', next: '/oidc/authorize?' + q });
const ts = String(Date.now()), nonce = randomBytes(16).toString('base64url');
const sign = (secret) => createHmac('sha256', secret).update(`${ts}.${nonce}.POST./api/internal/handoff.${createHash('sha256').update(body).digest('hex')}`).digest('hex');
const handoff = (sig) => fetch(B + '/api/internal/handoff', { method: 'POST', body, headers: { 'content-type': 'application/json', 'x-zaur-timestamp': ts, 'x-zaur-nonce': nonce, 'x-zaur-signature': sig } });
assert.equal((await handoff(sign('wrong'))).status, 401);
r = await handoff(sign('smoke-secret'));
const h2 = await r.json();
assert.equal(r.status, 200, JSON.stringify(h2));
r = await fetch(h2.claimUrl, { redirect: 'manual' });
assert.equal(r.status, 303);
assert.match(r.headers.get('location'), /^\/oidc\/authorize\?/);
const claimed = r.headers.getSetCookie().find((c) => c.startsWith('zaur_session='));
assert.ok(claimed);
console.log('claim →', r.headers.get('location').slice(0, 40), '| cookie set');
// The claimed session can authorize straight away.
r = await get(r.headers.get('location'), { cookie: claimed.split(';')[0] });
assert.match(r.headers.get('location'), /^http:\/\/localhost:9999\/cb\?code=/);
// Claim tokens are one-time.
r = await fetch(h2.claimUrl, { redirect: 'manual' });
assert.equal(r.headers.get('location'), '/login?welcome=1');

// RP-initiated logout (of the claimed session, not the seeded one).
r = await get('/oidc/logout?' + new URLSearchParams({ post_logout_redirect_uri: 'http://localhost:9999/', state: 'bye' }), { cookie: claimed.split(';')[0] });
assert.equal(r.status, 303);
console.log('logout →', r.headers.get('location'));
r = await get('/oidc/logout?' + new URLSearchParams({ post_logout_redirect_uri: 'https://evil.test/' }));
assert.equal(r.headers.get('location'), '/login?signed_out=1');
r = await get('/auth/return?to=' + encodeURIComponent('https://evil.test/'));
assert.equal(r.headers.get('location'), '/');
console.log('all OK');
