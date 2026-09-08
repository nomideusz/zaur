// Signup handoff: ask webmail to sign the new account in (server-to-server,
// signed with the shared secret — same scheme webmail uses when calling us,
// see requireInternalWebmail in server.js) and hand back a one-time claim URL
// the browser follows to receive its session cookie. Never blocks signup:
// any failure means the old "open mail and sign in" path.
const crypto = require('crypto');
const { getSiteConfig } = require('./site-config');
const { reportError } = require('./report');

const HANDOFF_PATH = '/api/internal/handoff';

function signedHeaders(secret, method, path, body, now = Date.now()) {
  const timestamp = String(now);
  const nonce = crypto.randomBytes(18).toString('base64url');
  const bodyHash = crypto.createHash('sha256').update(body).digest('hex');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${nonce}.${method}.${path}.${bodyHash}`)
    .digest('hex');
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'x-zaur-timestamp': timestamp,
    'x-zaur-nonce': nonce,
    'x-zaur-signature': signature,
  };
}

// Only webmail-relative paths are accepted as a destination.
function safeNext(next) {
  return typeof next === 'string' && next.length <= 2048 && next.startsWith('/') && !next.startsWith('//')
    ? next
    : undefined;
}

async function requestHandoff(email, password, next) {
  const secret = process.env.WEBMAIL_INTERNAL_SECRET?.trim();
  if (!secret) return null;
  const body = JSON.stringify({ email, password, next: safeNext(next) });
  try {
    const res = await fetch(`${getSiteConfig().webmailUrl}${HANDOFF_PATH}`, {
      method: 'POST',
      headers: signedHeaders(secret, 'POST', HANDOFF_PATH, body),
      body,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`webmail handoff ${res.status}`);
    const data = await res.json();
    return typeof data.claimUrl === 'string' ? data.claimUrl : null;
  } catch (err) {
    reportError(err, { where: 'webmail handoff' });
    return null;
  }
}

module.exports = { requestHandoff, signedHeaders, safeNext };
