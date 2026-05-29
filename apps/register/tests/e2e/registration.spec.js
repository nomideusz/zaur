const { execFileSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const { existsSync } = require('node:fs');
const { expect, test } = require('@playwright/test');

const adminPassword = process.env.REGISTER_ADMIN_PASSWORD;
const mailAdminPassword = process.env.STALWART_RECOVERY_ADMIN_PASSWORD;
const keycloakAdminUser = process.env.KEYCLOAK_ADMIN_USER;
const keycloakAdminPassword = process.env.KEYCLOAK_ADMIN_PASSWORD;
const keycloakRealm = process.env.KEYCLOAK_REALM || 'domains';
const keycloakUrl = (process.env.KEYCLOAK_PUBLIC_URL || 'https://keycloak.zaur.app').replace(/\/$/, '');
const domainId = process.env.REGISTER_E2E_DOMAIN_ID || 'b';
const domainName = process.env.REGISTER_E2E_DOMAIN || 'zaur.app';

test.skip(
  !adminPassword || !mailAdminPassword || !keycloakAdminUser || !keycloakAdminPassword,
  'Set register/Stalwart/Keycloak E2E credentials in .env.e2e.local',
);

function randomToken(prefix) {
  return `${prefix}-${randomBytes(5).toString('hex')}`;
}

async function adminLogin(request) {
  const response = await request.post('/api/admin/login', {
    data: { password: adminPassword },
  });
  expect(response.ok()).toBeTruthy();
}

async function createInvitation(request, recoveryEmail) {
  const response = await request.post('/api/admin/invitations/send', {
    data: { email: recoveryEmail, expiresInHours: 72 },
  });
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  const url = new URL(payload.invitation.magicLink);
  return {
    token: url.searchParams.get('token'),
    email: url.searchParams.get('email'),
  };
}

async function captchaAnswer(request) {
  const response = await request.get('/api/captcha');
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  const numbers = payload.question.match(/\d+/g).map(Number);
  return String(numbers.reduce((sum, value) => sum + value, 0));
}

async function cleanupWithAdminApi(request, email) {
  await request.post('/api/admin/cleanup-account', {
    data: { email, target: 'both' },
  }).catch(() => {});
}

function stalwartCli(args) {
  if (!existsSync('/root/.cargo/bin/stalwart-cli')) return '';
  return execFileSync(
    '/root/.cargo/bin/stalwart-cli',
    ['--url', 'https://mail.zaur.app', '--user', 'admin', '--password', mailAdminPassword, ...args],
    { encoding: 'utf8' },
  );
}

function deleteStalwartUser(username) {
  const output = stalwartCli([
    'query',
    'account',
    '--where',
    `name=${username}`,
    '--fields',
    'id,name,domainId',
    '--json',
  ]);
  if (!output) return;
  for (const line of output.split(/\r?\n/).filter(Boolean)) {
    const account = JSON.parse(line);
    if (account.name === username && account.domainId === domainId) {
      stalwartCli(['delete', 'account', '--ids', account.id]);
    }
  }
}

async function keycloakToken() {
  const body = new URLSearchParams({
    client_id: 'admin-cli',
    username: keycloakAdminUser,
    password: keycloakAdminPassword,
    grant_type: 'password',
  });
  const response = await fetch(`${keycloakUrl}/realms/master/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!response.ok) throw new Error(`Keycloak token failed: ${response.status}`);
  return (await response.json()).access_token;
}

async function deleteKeycloakUser(email) {
  const token = await keycloakToken();
  const query = new URLSearchParams({ email, exact: 'true' });
  const response = await fetch(`${keycloakUrl}/admin/realms/${keycloakRealm}/users?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return;
  const users = await response.json();
  for (const user of users) {
    if ((user.email || '').toLowerCase() !== email.toLowerCase()) continue;
    await fetch(`${keycloakUrl}/admin/realms/${keycloakRealm}/users/${user.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}

async function verifyMailbox(email, password) {
  const auth = `Basic ${Buffer.from(`${email}:${password}`).toString('base64')}`;
  const sessionResponse = await fetch('https://mail.zaur.app/.well-known/jmap', {
    headers: { Authorization: auth },
  });
  expect(sessionResponse.ok).toBeTruthy();
  const session = await sessionResponse.json();
  const accountId = session.primaryAccounts['urn:ietf:params:jmap:mail'];
  const mailboxResponse = await fetch(session.apiUrl, {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      using: ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail'],
      methodCalls: [['Mailbox/get', { accountId }, 'mb']],
    }),
  });
  expect(mailboxResponse.ok).toBeTruthy();
  const payload = await mailboxResponse.json();
  const roles = payload.methodResponses[0][1].list.map((mailbox) => mailbox.role).filter(Boolean).sort();
  expect(roles).toEqual(['archive', 'drafts', 'inbox', 'junk', 'sent', 'trash']);
}

test('registers a mailbox and cleans it up', async ({ request }) => {
  await adminLogin(request);

  const username = randomToken('e2e');
  const email = `${username}@${domainName}`;
  const password = `T3mp-${randomBytes(18).toString('base64url')}`;

  try {
    const invite = await createInvitation(request, `${username}-recovery@example.com`);
    const registerResponse = await request.post('/api/register', {
      data: {
        username,
        domainId,
        inviteToken: invite.token,
        inviteEmail: invite.email,
        password,
        confirmPassword: password,
      },
    });

    expect(registerResponse.ok()).toBeTruthy();
    expect(await registerResponse.json()).toMatchObject({ success: true, email });
    await verifyMailbox(email, password);
  } finally {
    await cleanupWithAdminApi(request, email);
    await deleteKeycloakUser(email).catch(() => {});
    deleteStalwartUser(username);
  }
});
