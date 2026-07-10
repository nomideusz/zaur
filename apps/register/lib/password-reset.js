const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const stalwart = require('./stalwart');
const invitations = require('./invitations');
const inviteMail = require('./invite-mail');
const { validatePassword } = require('./validation');

const TOKENS_FILE =
  process.env.PASSWORD_RESET_TOKENS_PATH || '/app/data/password_reset_tokens.json';
const DEFAULT_EXPIRES_SEC = Number.parseInt(process.env.PASSWORD_RESET_EXPIRES_SEC || '3600', 10);
const WEBMAIL_URL = (process.env.WEBMAIL_URL || 'https://webmail.zaur.app').replace(/\/$/, '');
const REGISTER_URL = (process.env.REGISTER_PUBLIC_URL || 'https://register.zaur.app').replace(
  /\/$/,
  '',
);

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
  // Write-then-rename so a crash mid-write never truncates the token store.
  const tmp = `${TOKENS_FILE}.${crypto.randomBytes(6).toString('hex')}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(pruned.slice(0, 500), null, 2), 'utf8');
  fs.renameSync(tmp, TOKENS_FILE);
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
        (!item.kind || item.kind === 'password-reset') &&
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
    kind: 'password-reset',
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

function findActiveRecoveryChange(mailboxEmail, token) {
  const mailbox = normalizeEmail(mailboxEmail);
  const cleanToken = String(token || '').trim();
  const tokenHash = hashToken(cleanToken);
  const now = Date.now();
  return (
    readTokens().find(
      (item) =>
        item.kind === 'recovery-change' &&
        matchesToken(item, cleanToken, tokenHash) &&
        normalizeEmail(item.mailboxEmail) === mailbox &&
        !item.usedAt &&
        !item.revokedAt &&
        Date.parse(item.expiresAt) > now,
    ) || null
  );
}

async function requestRecoveryChange(mailboxEmail, recoveryEmail) {
  const mailbox = normalizeEmail(mailboxEmail);
  const recovery = normalizeEmail(recoveryEmail);
  if (!isValidEmail(mailbox) || !isValidEmail(recovery) || mailbox === recovery) {
    throw new Error('A different, valid recovery email is required.');
  }
  const existingMailbox = invitations.findMailboxByRecoveryEmail(recovery);
  if (existingMailbox && existingMailbox !== mailbox) {
    throw new Error('That recovery email is already in use.');
  }
  const now = Date.now();
  const expiresAt = now + 30 * 60 * 1000;
  const token = generateToken();
  const tokens = readTokens();
  for (const item of tokens) {
    if (
      item.kind === 'recovery-change' &&
      normalizeEmail(item.mailboxEmail) === mailbox &&
      !item.usedAt &&
      !item.revokedAt
    ) {
      item.revokedAt = new Date(now).toISOString();
    }
  }
  tokens.unshift({
    kind: 'recovery-change',
    tokenHash: hashToken(token),
    mailboxEmail: mailbox,
    recoveryEmail: recovery,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(expiresAt).toISOString(),
    usedAt: null,
    revokedAt: null,
  });
  writeTokens(tokens);
  const verificationLink = `${REGISTER_URL}/api/recovery/verify?${new URLSearchParams({
    token,
    email: mailbox,
  }).toString()}`;
  await inviteMail.sendRecoveryChangeEmail({
    to: recovery,
    mailboxEmail: mailbox,
    verificationLink,
    expiresAt,
  });
  return { ok: true };
}

function confirmRecoveryChange(mailboxEmail, token) {
  const entry = findActiveRecoveryChange(mailboxEmail, token);
  if (!entry) return { valid: false };
  invitations.setRecoveryEmailByMailbox(entry.mailboxEmail, entry.recoveryEmail);
  const tokens = readTokens();
  const stored = tokens.find(
    (item) => item.kind === 'recovery-change' && item.tokenHash === entry.tokenHash,
  );
  if (stored) stored.usedAt = new Date().toISOString();
  writeTokens(tokens);
  return { valid: true, mailboxEmail: entry.mailboxEmail };
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

// Revoke any pending reset links for an address (writeTokens then prunes them).
// Called on account delete / re-registration so a recycled address starts clean.
function revokeTokensForMailbox(mailboxEmail) {
  const normalized = normalizeEmail(mailboxEmail);
  const tokens = readTokens();
  let changed = false;
  for (const item of tokens) {
    if (normalizeEmail(item.mailboxEmail) === normalized && !item.usedAt && !item.revokedAt) {
      item.revokedAt = new Date().toISOString();
      changed = true;
    }
  }
  if (changed) writeTokens(tokens);
}

module.exports = {
  isEnabled,
  requestReset,
  verifyToken,
  resetPassword,
  revokeTokensForMailbox,
  requestRecoveryChange,
  confirmRecoveryChange,
  GENERIC_SUCCESS,
};
