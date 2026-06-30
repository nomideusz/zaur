const fs = require('fs');
const path = require('path');

const AUDIT_FILE = process.env.INVITATIONS_AUDIT_PATH || '/app/data/invitations_audit.json';

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

// Invitations were backed by the (now removed) identity provider and are disabled.
function requiresInvitation() {
  return false;
}

async function validateInvitation() {
  return { valid: false, error: 'Invitations are disabled.' };
}

async function consumeInvitation() {
  return { valid: false, error: 'Invitations are disabled.' };
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

async function createInvitation() {
  throw new Error('Invitations are disabled.');
}

function listInvitations() {
  return readAudit().map((item) => ({ ...item, status: item.mailboxEmail ? 'used' : 'unknown' }));
}

async function revokeInvitation() {
  throw new Error('Invitations are disabled.');
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
