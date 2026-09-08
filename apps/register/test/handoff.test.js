const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');

// Verify the way webmail's verifyInternalSignature does (and requireInternalWebmail in server.js).
function verify(secret, headers, method, path, body) {
  const bodyHash = crypto.createHash('sha256').update(body).digest('hex');
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${headers['x-zaur-timestamp']}.${headers['x-zaur-nonce']}.${method}.${path}.${bodyHash}`)
    .digest('hex');
  return expected === headers['x-zaur-signature'] && /^[A-Za-z0-9_-]{16,64}$/.test(headers['x-zaur-nonce']);
}

test('signedHeaders produce a verifiable signature', () => {
  const { signedHeaders } = require('../lib/webmail-handoff');
  const body = '{"email":"x@y.z"}';
  const h = signedHeaders('s3cret', 'POST', '/api/internal/handoff', body, 1700000000000);
  assert.equal(h['x-zaur-timestamp'], '1700000000000');
  assert.equal(verify('s3cret', h, 'POST', '/api/internal/handoff', body), true);
  assert.equal(verify('s3cret', h, 'POST', '/api/internal/handoff', body + 'x'), false);
});

test('requestHandoff returns the claim URL, or null when webmail fails', async () => {
  let calls = 0;
  const srv = http.createServer((req, res) => {
    calls += 1;
    let b = '';
    req.on('data', (c) => (b += c));
    req.on('end', () => {
      const ok = verify('s3cret', req.headers, 'POST', req.url, b) && JSON.parse(b).next === '/oidc/authorize?x=1';
      if (calls === 1) {
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify(ok ? { claimUrl: 'https://mail.test/auth/claim?token=t' } : { error: 'bad sig' }));
      } else {
        res.statusCode = 500;
        res.end();
      }
    });
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  process.env.WEBMAIL_URL = `http://127.0.0.1:${srv.address().port}`;
  process.env.WEBMAIL_INTERNAL_SECRET = 's3cret';
  process.env.TRACEWAY_DSN = '';
  delete require.cache[require.resolve('../lib/site-config')];
  delete require.cache[require.resolve('../lib/webmail-handoff')];
  const { requestHandoff } = require('../lib/webmail-handoff');
  assert.equal(await requestHandoff('x@y.z', 'pw', '/oidc/authorize?x=1'), 'https://mail.test/auth/claim?token=t');
  assert.equal(await requestHandoff('x@y.z', 'pw', '//evil'), null); // 500 → null, never throws
  srv.close();
});
