#!/usr/bin/env node
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const crypto = require('crypto');
const invites = require('../lib/invites');

const args = process.argv.slice(2);
const command = args[0];

function generateRandomCode() {
  // Generates a code format like: zaur-ABCD-EFGH-IJKL
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Readable chars (no O, I, 1, 0)
  const segment = () => Array.from({ length: 4 }, () => chars[crypto.randomInt(chars.length)]).join('');
  return `zaur-${segment()}-${segment()}-${segment()}`;
}

switch (command) {
  case 'generate': {
    const count = parseInt(args[1] || '1', 10);
    if (isNaN(count) || count <= 0) {
      console.error('Usage: node scripts/manage-invites.js generate [number]');
      process.exit(1);
    }

    const currentInvites = invites.readInvites();
    const newCodes = [];

    for (let i = 0; i < count; i++) {
      const code = generateRandomCode();
      const codeObj = {
        code,
        used: false,
        usedAt: null,
        emailCreated: null,
        createdAt: new Date().toISOString(),
        revoked: false,
      };
      currentInvites.push(codeObj);
      newCodes.push(codeObj);
    }

    invites.writeInvites(currentInvites);
    console.log(`Successfully generated ${count} invite code(s):`);
    newCodes.forEach((c) => console.log(`  ${c.code}`));
    break;
  }

  case 'list': {
    const list = invites.readInvites();
    if (list.length === 0) {
      console.log('No invite codes found.');
      break;
    }

    console.log('Invite Codes Status:');
    console.log('----------------------------------------------------');
    list.forEach((c) => {
      let status = '\x1b[32mUNUSED\x1b[0m';
      if (c.revoked) {
        status = '\x1b[31mREVOKED\x1b[0m';
      } else if (c.used) {
        status = `\x1b[33mUSED by ${c.emailCreated} at ${c.usedAt}\x1b[0m`;
      }
      console.log(`Code: ${c.code} | Status: ${status}`);
    });
    console.log('----------------------------------------------------');
    break;
  }

  case 'revoke': {
    const targetCode = args[1];
    if (!targetCode) {
      console.error('Usage: node scripts/manage-invites.js revoke [code]');
      process.exit(1);
    }

    const list = invites.readInvites();
    const found = list.find((c) => c.code === targetCode.trim());

    if (!found) {
      console.error(`Invite code ${targetCode} not found.`);
      process.exit(1);
    }

    if (found.used) {
      console.error(`Invite code ${targetCode} has already been used and cannot be revoked.`);
      process.exit(1);
    }

    found.revoked = true;
    invites.writeInvites(list);
    console.log(`Successfully revoked code: ${targetCode}`);
    break;
  }

  default: {
    console.log('Invitation Code Manager CLI');
    console.log('Usage:');
    console.log('  node scripts/manage-invites.js generate [count]   - Generate new invite code(s)');
    console.log('  node scripts/manage-invites.js list               - List all codes');
    console.log('  node scripts/manage-invites.js revoke [code]      - Revoke an unused invite code');
    break;
  }
}
