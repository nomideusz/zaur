#!/usr/bin/env node
/**
 * Create a registration magic link for a personal / recovery email.
 *
 * Usage:
 *   node scripts/send-invitation.js user@gmail.com
 *   node scripts/send-invitation.js user@gmail.com --hours 48
 */
require('dotenv').config();

const invitations = require('../lib/invitations');

async function main() {
  const email = process.argv[2];
  const hoursFlag = process.argv.indexOf('--hours');
  const expiresInHours = hoursFlag >= 0 ? Number.parseInt(process.argv[hoursFlag + 1] || '72', 10) : 72;

  if (!email) {
    console.error('Usage: node scripts/send-invitation.js <recovery-email> [--hours 72]');
    process.exit(1);
  }

  const invitation = await invitations.createInvitation(email, Math.max(3600, expiresInHours * 3600));
  console.log(`Recovery email: ${invitation.recoveryEmail}`);
  console.log(`Expires: ${new Date(invitation.expiresAt).toISOString()}`);
  console.log(`Magic link:\n${invitation.magicLink}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
