const fs = require('fs');
const path = require('path');

const INVITES_FILE = process.env.INVITES_FILE_PATH || '/app/data/invite_codes.json';
const PENDING_INVITE_TTL_MS = Number.parseInt(
  process.env.PENDING_INVITE_TTL_MS || `${15 * 60 * 1000}`,
  10,
);

// Helper to ensure the data folder and file exists
function ensureInvitesFile() {
  const dir = path.dirname(INVITES_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(INVITES_FILE)) {
    fs.writeFileSync(INVITES_FILE, JSON.stringify([], null, 2), 'utf8');
  }
}

function readInvites() {
  ensureInvitesFile();
  try {
    const raw = fs.readFileSync(INVITES_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to read invites file:', err.message);
    return [];
  }
}

function writeInvites(invites) {
  ensureInvitesFile();
  try {
    fs.writeFileSync(INVITES_FILE, JSON.stringify(invites, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Failed to write invites file:', err.message);
    return false;
  }
}

function cleanupPendingReservations() {
  const invites = readInvites();
  const cutoff = Date.now() - PENDING_INVITE_TTL_MS;
  let changed = false;

  for (const invite of invites) {
    if (!invite.pending || invite.used) continue;
    const pendingAt = invite.pendingAt ? new Date(invite.pendingAt).getTime() : 0;
    if (!pendingAt || pendingAt < cutoff) {
      delete invite.pending;
      delete invite.pendingAt;
      delete invite.emailPending;
      changed = true;
    }
  }

  if (changed) writeInvites(invites);
  return changed;
}

function validateInvite(code) {
  cleanupPendingReservations();

  if (!code || typeof code !== 'string') {
    return { valid: false, error: 'Please enter an invitation code.' };
  }

  const cleanCode = code.trim();
  const invites = readInvites();
  const found = invites.find((item) => item.code === cleanCode);

  if (!found) {
    return { valid: false, error: 'Invalid invitation code.' };
  }

  if (found.used) {
    return { valid: false, error: 'This invitation code has already been used.' };
  }

  if (found.revoked) {
    return { valid: false, error: 'This invitation code has been revoked.' };
  }

  if (found.pending) {
    return { valid: false, error: 'This invitation code is already being used.' };
  }

  return { valid: true, invite: found };
}

function reserveInvite(code, emailPending) {
  cleanupPendingReservations();

  const cleanCode = code.trim();
  const invites = readInvites();
  const found = invites.find((item) => item.code === cleanCode);

  if (!found) {
    return { valid: false, error: 'Invalid invitation code.' };
  }

  if (found.used) {
    return { valid: false, error: 'This invitation code has already been used.' };
  }

  if (found.revoked) {
    return { valid: false, error: 'This invitation code has been revoked.' };
  }

  if (found.pending) {
    return { valid: false, error: 'This invitation code is already being used.' };
  }

  found.pending = true;
  found.pendingAt = new Date().toISOString();
  found.emailPending = emailPending;
  if (!writeInvites(invites)) {
    return { valid: false, error: 'Could not reserve invitation code.' };
  }
  return { valid: true, invite: found };
}

function releaseInviteReservation(code) {
  const cleanCode = code.trim();
  const invites = readInvites();
  const found = invites.find((item) => item.code === cleanCode);
  if (!found || found.used) return false;

  delete found.pending;
  delete found.pendingAt;
  delete found.emailPending;
  return writeInvites(invites);
}

function markInviteAsUsed(code, emailCreated) {
  const cleanCode = code.trim();
  const invites = readInvites();
  const found = invites.find((item) => item.code === cleanCode);

  if (found) {
    found.used = true;
    found.usedAt = new Date().toISOString();
    found.emailCreated = emailCreated;
    delete found.pending;
    delete found.pendingAt;
    delete found.emailPending;
    return writeInvites(invites);
  }
  return false;
}

module.exports = {
  readInvites,
  writeInvites,
  cleanupPendingReservations,
  validateInvite,
  reserveInvite,
  releaseInviteReservation,
  markInviteAsUsed,
};
