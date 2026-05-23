const fs = require('fs');
const path = require('path');

const INVITES_FILE = process.env.INVITES_FILE_PATH || '/app/data/invite_codes.json';

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

function validateInvite(code) {
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

  return { valid: true, invite: found };
}

function markInviteAsUsed(code, emailCreated) {
  const cleanCode = code.trim();
  const invites = readInvites();
  const found = invites.find((item) => item.code === cleanCode);

  if (found) {
    found.used = true;
    found.usedAt = new Date().toISOString();
    found.emailCreated = emailCreated;
    writeInvites(invites);
    return true;
  }
  return false;
}

module.exports = {
  readInvites,
  writeInvites,
  validateInvite,
  markInviteAsUsed,
};
