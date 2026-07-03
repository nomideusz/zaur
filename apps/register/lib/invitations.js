const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

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

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

function requiresInvitation() {
  return process.env.REGISTRATION_OPEN !== 'true';
}

function findActiveEntry(recoveryEmail, token) {
  const email = normalizeEmail(recoveryEmail);
  const cleanToken = String(token || '').trim();
  if (!email || !cleanToken) {
    return { valid: false, error: 'Invitation link is incomplete.' };
  }

  const tokenHash = hashToken(cleanToken);
  const entry = readAudit().find(
    (item) => item.tokenHash === tokenHash && normalizeEmail(item.recoveryEmail) === email,
  );

  if (
    !entry ||
    entry.revokedAt ||
    entry.consumedAt ||
    !entry.expiresAt ||
    Date.parse(entry.expiresAt) < Date.now()
  ) {
    return { valid: false, error: 'This invitation link is invalid or has expired.' };
  }

  return { valid: true, entry };
}

async function validateInvitation(recoveryEmail, token) {
  const check = findActiveEntry(recoveryEmail, token);
  return check.valid ? { valid: true, recoveryEmail: normalizeEmail(recoveryEmail) } : check;
}

async function consumeInvitation(recoveryEmail, token) {
  const check = findActiveEntry(recoveryEmail, token);
  if (!check.valid) return check;

  const entries = readAudit();
  const found = entries.find((item) => item.id === check.entry.id);
  if (!found) {
    return { valid: false, error: 'This invitation link is invalid or has expired.' };
  }
  found.consumedAt = new Date().toISOString();
  writeAudit(entries);
  return { valid: true, recoveryEmail: normalizeEmail(recoveryEmail) };
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

function findRecoveryEmailByMailbox(mailboxEmail) {
  const normalized = normalizeEmail(mailboxEmail);
  const entry = readAudit().find((item) => normalizeEmail(item.mailboxEmail) === normalized);
  return entry?.recoveryEmail ? normalizeEmail(entry.recoveryEmail) : null;
}

function findMailboxByRecoveryEmail(recoveryEmail) {
  const normalized = normalizeEmail(recoveryEmail);
  const entry = readAudit().find((item) => normalizeEmail(item.recoveryEmail) === normalized);
  return entry?.mailboxEmail ? normalizeEmail(entry.mailboxEmail) : null;
}

async function createInvitation(recoveryEmail, expiresInSec = DEFAULT_EXPIRES_SEC) {
  const email = normalizeEmail(recoveryEmail);
  if (!isValidEmail(email)) {
    throw new Error('A valid recovery email is required.');
  }

  const token = crypto.randomBytes(32).toString('base64url');
  const id = crypto.randomUUID();
  const expiresAt = Date.now() + expiresInSec * 1000;

  const registerUrl = process.env.REGISTER_PUBLIC_URL || 'https://register.zaur.app';
  const magicLink = `${registerUrl.replace(/\/$/, '')}/?${new URLSearchParams({
    token,
    email,
  }).toString()}`;

  const entries = readAudit();
  entries.unshift({
    id,
    recoveryEmail: email,
    tokenHash: hashToken(token),
    createdAt: new Date().toISOString(),
    expiresAt: new Date(expiresAt).toISOString(),
    mailboxEmail: null,
    consumedAt: null,
  });
  writeAudit(entries);

  return { id, recoveryEmail: email, magicLink, expiresAt };
}

function invitationStatus(item) {
  if (item.mailboxEmail) return 'registered';
  if (item.revokedAt) return 'revoked';
  if (item.consumedAt) return 'opened';
  if (!item.expiresAt || Date.parse(item.expiresAt) < Date.now()) return 'expired';
  return 'sent';
}

async function listInvitations() {
  return readAudit().map((item) => ({ ...item, status: invitationStatus(item) }));
}

async function revokeInvitation(invitationId) {
  if (!invitationId) {
    throw new Error('Invitation id is required.');
  }
  const entries = readAudit();
  const found = entries.find((item) => item.id === invitationId || item.logtoTokenId === invitationId);
  if (!found) {
    throw new Error('Invitation not found.');
  }
  found.revokedAt = new Date().toISOString();
  writeAudit(entries);
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
  findRecoveryEmailByMailbox,
  findMailboxByRecoveryEmail,
  isValidEmail,
};
