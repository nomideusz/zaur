const crypto = require('node:crypto');

/**
 * How many times a password shows up in known breaches, per Have I Been Pwned's
 * Pwned Passwords (no key). Only the first 5 hex characters of its SHA-1 leave
 * this server (k-anonymity), padded so the answer's size says nothing either.
 * When the service cannot be reached the answer is 0: a signup is not blocked
 * by somebody else's outage.
 */
async function breachCount(password) {
  const hash = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
  try {
    const response = await fetch(`https://api.pwnedpasswords.com/range/${hash.slice(0, 5)}`, {
      headers: { 'Add-Padding': 'true', 'User-Agent': 'zaur-register' },
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) throw new Error(`Pwned Passwords answered ${response.status}`);
    return countIn(await response.text(), hash.slice(5));
  } catch (error) {
    console.warn('[pwned] check skipped:', error.message);
    return 0;
  }
}

/** The count on the `SUFFIX:COUNT` line for this suffix; padding lines count 0. */
function countIn(body, suffix) {
  for (const line of body.split('\n')) {
    const [rest, count] = line.trim().split(':');
    if (rest === suffix) return Number(count) || 0;
  }
  return 0;
}

const BREACHED =
  'This password has appeared in a data breach, so it is on the lists attackers try first. Choose another.';

module.exports = { breachCount, countIn, BREACHED };
