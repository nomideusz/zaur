const fs = require('fs');
const path = require('path');
const logto = require('./logto');

const AUDIT_FILE = process.env.INVITATIONS_AUDIT_PATH || '/app/data/invitations_audit.json';
const DEFAULT_EXPIRES_SEC = Number.parseInt(process.env.INVITATION_EXPIRES_SEC || `${72 * 3600}`, 10);

function ensureAuditFile() {
  const dir = path.dirname(AUDIT_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(AUDIT_FILE)) {
    fs.writeFileSync(AUDIT_FILE, JSON.stringify([], null, 2), 'utf8');
  }
}

function readAudit() {
  ensureAuditFile();
  try {
    return JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf8'));
  } catch (err) {
    console.error('Failed to read invitations audit file:', err.message);
    return [];
  }
}

function writeAudit(entries) {
  ensureAuditFile();
  fs.writeFileSync(AUDIT_FILE, JSON.stringify(entries, null, 2), 'utf8');
  return true;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function requiresInvitation() {
  if (process.env.REGISTRATION_OPEN === 'true') return false;
  return logto.isConfigured();
}

async function findActiveToken(recoveryEmail, token) {
  const email = normalizeEmail(recoveryEmail);
  const cleanToken = String(token || '').trim();
  if (!email || !cleanToken) {
    return { valid: false, error: 'Invitation link is incomplete.' };
  }

  if (!logto.isConfigured()) {
    return { valid: false, error: 'Invitations are not configured.' };
  }

  const matches = await logto.findOneTimeTokens(cleanToken);
  const entry = matches.find(
    (item) =>
      item.token === cleanToken &&
      normalizeEmail(item.email) === email &&
      item.status === 'active' &&
      item.expiresAt > Date.now(),
  );

  if (!entry) {
    return { valid: false, error: 'This invitation link is invalid or has expired.' };
  }

  return { valid: true, token: entry };
}

async function validateInvitation(recoveryEmail, token) {
  return findActiveToken(recoveryEmail, token);
}

async function consumeInvitation(recoveryEmail, token) {
  const check = await findActiveToken(recoveryEmail, token);
  if (!check.valid) return check;

  try {
    const consumed = await logto.verifyOneTimeToken(recoveryEmail, token);
    markAuditConsumed(recoveryEmail, token, consumed?.id);
    return { valid: true, recoveryEmail: normalizeEmail(recoveryEmail) };
  } catch (err) {
    return { valid: false, error: err.message || 'Could not verify invitation.' };
  }
}

function markAuditConsumed(recoveryEmail, token, logtoTokenId) {
  const email = normalizeEmail(recoveryEmail);
  const entries = readAudit();
  const found = entries.find(
    (item) =>
      normalizeEmail(item.recoveryEmail) === email &&
      (item.token === token || item.logtoTokenId === logtoTokenId),
  );
  if (found) {
    found.consumedAt = new Date().toISOString();
    writeAudit(entries);
  }
}

function markAuditMailbox(recoveryEmail, mailboxEmail) {
  const email = normalizeEmail(recoveryEmail);
  const entries = readAudit();
  const found = entries.find((item) => normalizeEmail(item.recoveryEmail) === email && !item.mailboxEmail);
  if (found) {
    found.mailboxEmail = normalizeEmail(mailboxEmail);
    writeAudit(entries);
  }
}

async function createInvitation(recoveryEmail, expiresInSec = DEFAULT_EXPIRES_SEC) {
  const email = normalizeEmail(recoveryEmail);
  if (!isValidEmail(email)) {
    throw new Error('A valid recovery email is required.');
  }
  if (!logto.isConfigured()) {
    throw new Error('Logto is not configured for invitations.');
  }

  const created = await logto.createOneTimeToken(email, expiresInSec);
  const registerUrl = process.env.REGISTER_PUBLIC_URL || 'https://register.zaur.app';
  const magicLink = `${registerUrl.replace(/\/$/, '')}/?${new URLSearchParams({
    token: created.token,
    email,
  }).toString()}`;

  const entries = readAudit();
  entries.unshift({
    recoveryEmail: email,
    logtoTokenId: created.id,
    token: created.token,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(created.expiresAt).toISOString(),
    mailboxEmail: null,
    consumedAt: null,
  });
  writeAudit(entries);

  return {
    recoveryEmail: email,
    magicLink,
    expiresAt: created.expiresAt,
    logtoTokenId: created.id,
  };
}

async function listInvitations() {
  const audit = readAudit();
  if (!logto.isConfigured()) {
    return audit.map((item) => ({ ...item, status: item.mailboxEmail ? 'used' : 'unknown' }));
  }

  const remote = await logto.listOneTimeTokens();
  const remoteById = new Map(remote.map((item) => [item.id, item]));

  return audit.map((item) => {
    const remoteItem = remoteById.get(item.logtoTokenId);
    let status = 'sent';
    if (item.mailboxEmail) status = 'registered';
    else if (remoteItem?.status === 'consumed') status = 'opened';
    else if (remoteItem?.status === 'active') status = 'sent';
    else if (item.expiresAt && Date.parse(item.expiresAt) < Date.now()) status = 'expired';
    else status = 'revoked';

    return {
      ...item,
      status,
      remoteStatus: remoteItem?.status || null,
    };
  });
}

async function revokeInvitation(logtoTokenId) {
  if (!logtoTokenId) {
    throw new Error('Invitation id is required.');
  }
  await logto.deleteOneTimeToken(logtoTokenId);
  const entries = readAudit();
  const found = entries.find((item) => item.logtoTokenId === logtoTokenId);
  if (found) {
    found.revokedAt = new Date().toISOString();
    writeAudit(entries);
  }
  return true;
}

module.exports = {
  requiresInvitation,
  validateInvitation,
  consumeInvitation,
  createInvitation,
  listInvitations,
  revokeInvitation,
  markAuditMailbox,
  isValidEmail,
};
