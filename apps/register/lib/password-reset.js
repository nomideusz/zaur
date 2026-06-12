const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const stalwart = require('./stalwart');
const logto = require('./logto');
const invitations = require('./invitations');
const inviteMail = require('./invite-mail');
const { validatePassword } = require('./validation');

const TOKENS_FILE =
  process.env.PASSWORD_RESET_TOKENS_PATH || '/app/data/password_reset_tokens.json';
const DEFAULT_EXPIRES_SEC = Number.parseInt(process.env.PASSWORD_RESET_EXPIRES_SEC || '3600', 10);
const WEBMAIL_URL = (process.env.WEBMAIL_URL || 'https://webmail.zaur.app').replace(/\/$/, '');

const GENERIC_SUCCESS =
  'If an account exists for that address, we sent password reset instructions to its recovery email.';

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function ensureTokensFile() {
  const dir = path.dirname(TOKENS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(TOKENS_FILE)) {
    fs.writeFileSync(TOKENS_FILE, JSON.stringify([], null, 2), 'utf8');
  }
}

function readTokens() {
  ensureTokensFile();
  try {
    return JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'));
  } catch (err) {
    console.error('Failed to read password reset tokens:', err.message);
    return [];
  }
}

function writeTokens(entries) {
  ensureTokensFile();
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const pruned = entries.filter((item) => {
    const expiresAt = Date.parse(item.expiresAt || '');
    return !item.usedAt && !item.revokedAt && Number.isFinite(expiresAt) && expiresAt > cutoff;
  });
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(pruned.slice(0, 500), null, 2), 'utf8');
  return true;
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

/** Only the hash is stored at rest — a leaked tokens file cannot be replayed. */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function matchesToken(item, cleanToken, tokenHash) {
  if (item.tokenHash) return item.tokenHash === tokenHash;
  // Legacy entries created before hashing stored the raw token.
  return item.token === cleanToken;
}

function findActiveToken(mailboxEmail, token) {
  const email = normalizeEmail(mailboxEmail);
  const cleanToken = String(token || '').trim();
  if (!email || !cleanToken) return null;

  const tokenHash = hashToken(cleanToken);
  const now = Date.now();
  return (
    readTokens().find(
      (item) =>
        matchesToken(item, cleanToken, tokenHash) &&
        normalizeEmail(item.mailboxEmail) === email &&
        !item.usedAt &&
        !item.revokedAt &&
        Date.parse(item.expiresAt) > now,
    ) || null
  );
}

async function resolveRecoveryEmail(mailboxEmail) {
  const normalized = normalizeEmail(mailboxEmail);

  if (logto.isConfigured()) {
    try {
      const user = await logto.getUserByEmail(normalized);
      const recovery = user?.customData?.recoveryEmail;
      if (recovery) return normalizeEmail(recovery);
    } catch (err) {
      console.error('resolveRecoveryEmail logto:', err.message);
    }
  }

  const fromAudit = invitations.findRecoveryEmailByMailbox(normalized);
  if (fromAudit) return fromAudit;

  return normalized;
}

/** Accept mailbox or invitation (recovery) email; returns mailbox address if found. */
async function resolveMailboxEmail(input) {
  const normalized = normalizeEmail(input);
  if (!isValidEmail(normalized)) return null;

  if (await stalwart.findAccountByEmail(normalized)) {
    return normalized;
  }

  const fromAudit = invitations.findMailboxByRecoveryEmail(normalized);
  if (fromAudit && (await stalwart.findAccountByEmail(fromAudit))) {
    return fromAudit;
  }

  if (logto.isConfigured()) {
    try {
      const fromLogto = await logto.findPrimaryEmailByRecoveryEmail(normalized);
      if (fromLogto && (await stalwart.findAccountByEmail(fromLogto))) {
        return fromLogto;
      }
    } catch (err) {
      console.error('resolveMailboxEmail logto:', err.message);
    }
  }

  return null;
}

function isEnabled() {
  return inviteMail.isConfigured();
}

async function requestReset(emailInput) {
  if (!isEnabled()) {
    throw new Error('Password reset email is not configured.');
  }

  const email = normalizeEmail(emailInput);
  if (!isValidEmail(email)) {
    return { ok: true, message: GENERIC_SUCCESS };
  }

  const mailboxEmail = await resolveMailboxEmail(email);
  if (!mailboxEmail) {
    return { ok: true, message: GENERIC_SUCCESS };
  }

  const recoveryEmail = await resolveRecoveryEmail(mailboxEmail);
  const now = Date.now();
  const expiresAt = now + Math.max(900, DEFAULT_EXPIRES_SEC) * 1000;
  const token = generateToken();

  const tokens = readTokens();
  for (const item of tokens) {
    if (normalizeEmail(item.mailboxEmail) === mailboxEmail && !item.usedAt && !item.revokedAt) {
      item.revokedAt = new Date(now).toISOString();
    }
  }

  tokens.unshift({
    tokenHash: hashToken(token),
    mailboxEmail,
    recoveryEmail,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(expiresAt).toISOString(),
    usedAt: null,
    revokedAt: null,
  });
  writeTokens(tokens);

  const resetLink = `${WEBMAIL_URL}/forgot-password/reset?${new URLSearchParams({
    token,
    email: mailboxEmail,
  }).toString()}`;

  // Fire-and-forget: responding before the SMTP round-trip keeps the response
  // time identical for known and unknown addresses (no enumeration by timing).
  inviteMail
    .sendPasswordResetEmail({
      to: recoveryEmail,
      mailboxEmail,
      resetLink,
      expiresAt,
    })
    .catch((err) => {
      console.error(`Failed to send reset email for ${mailboxEmail}:`, err.message);
    });

  return { ok: true, message: GENERIC_SUCCESS };
}

function verifyToken(mailboxEmail, token) {
  const entry = findActiveToken(mailboxEmail, token);
  if (!entry) {
    return { valid: false, error: 'This reset link is invalid or has expired.' };
  }
  return { valid: true, mailboxEmail: entry.mailboxEmail };
}

async function resetPassword(mailboxEmail, token, password, confirmPassword) {
  const validation = validatePassword(password, confirmPassword);
  if (!validation.valid) {
    return { valid: false, error: validation.error };
  }

  const entry = findActiveToken(mailboxEmail, token);
  if (!entry) {
    return { valid: false, error: 'This reset link is invalid or has expired.' };
  }

  const email = normalizeEmail(entry.mailboxEmail);
  await stalwart.changePassword(email, password);

  if (logto.isConfigured()) {
    try {
      await logto.updatePassword(email, password);
    } catch (err) {
      console.error('resetPassword logto:', err.message);
      // Token stays unused so the user can retry once sign-in sync recovers.
      return {
        valid: false,
        error: 'Password was updated for mail, but sign-in sync failed. Contact support.',
      };
    }

    // Sign out everywhere — a hijacked session must not survive the reset.
    try {
      const revoked = await logto.revokeUserSessions(email);
      if (revoked) console.log(`resetPassword: revoked ${revoked} session(s) for ${email}`);
    } catch (err) {
      console.error('resetPassword revoke sessions:', err.message);
    }
  }

  const tokens = readTokens();
  const stored = tokens.find(
    (item) =>
      (entry.tokenHash && item.tokenHash === entry.tokenHash) ||
      (entry.token && item.token === entry.token),
  );
  if (stored) {
    stored.usedAt = new Date().toISOString();
  }
  writeTokens(tokens);

  return { valid: true, mailboxEmail: email };
}

module.exports = {
  isEnabled,
  requestReset,
  verifyToken,
  resetPassword,
  GENERIC_SUCCESS,
};
