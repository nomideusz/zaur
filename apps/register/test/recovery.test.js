const assert = require('node:assert/strict');
const { mkdtempSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const test = require('node:test');

process.env.INVITATIONS_AUDIT_PATH = path.join(
  mkdtempSync(path.join(tmpdir(), 'zaur-recovery-')),
  'audit.json',
);
const invitations = require('../lib/invitations');

test('recovery mapping migrates invitation mailboxes and supports later changes', () => {
  invitations.setRecoveryEmailByMailbox('Mailbox@ZAUR.app', 'first@example.com');
  assert.equal(invitations.findRecoveryEmailByMailbox('mailbox@zaur.app'), 'first@example.com');
  invitations.setRecoveryEmailByMailbox('mailbox@zaur.app', 'second@example.com');
  assert.equal(invitations.findRecoveryEmailByMailbox('MAILBOX@ZAUR.APP'), 'second@example.com');
  assert.equal(invitations.findMailboxByRecoveryEmail('second@example.com'), 'mailbox@zaur.app');
});
