const { execFile } = require('child_process');

const LLDAP_URL = (process.env.LLDAP_URL || 'http://srv-captain--lldap:17170').replace(/\/$/, '');
const LLDAP_LDAP_URL = process.env.LLDAP_LDAP_URL || 'ldap://srv-captain--lldap:3890';
const LLDAP_BASE_DN = process.env.LLDAP_BASE_DN || 'dc=zaur,dc=app';
const LLDAP_USERS_OU = process.env.LLDAP_USERS_OU || 'ou=people';
const LLDAP_ADMIN_USER = process.env.LLDAP_ADMIN_USER || 'lldapadmin';
const LLDAP_ADMIN_PASSWORD = process.env.LLDAP_ADMIN_PASSWORD;
const LLDAP_ADMIN_DN =
  process.env.LLDAP_ADMIN_DN || `uid=${LLDAP_ADMIN_USER},${LLDAP_USERS_OU},${LLDAP_BASE_DN}`;

function userDn(userId) {
  return `uid=${userId},${LLDAP_USERS_OU},${LLDAP_BASE_DN}`;
}

async function getAdminToken() {
  if (!LLDAP_ADMIN_PASSWORD) {
    throw new Error('LLDAP admin credentials are not configured in environment.');
  }

  const response = await fetch(`${LLDAP_URL}/auth/simple/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: LLDAP_ADMIN_USER, password: LLDAP_ADMIN_PASSWORD }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to obtain LLDAP admin token: ${response.status} ${errText}`);
  }

  const data = await response.json();
  return data.token;
}

async function graphql(query, variables) {
  const token = await getAdminToken();
  const response = await fetch(`${LLDAP_URL}/api/graphql`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.errors) {
    const detail = body.errors?.map((e) => e.message).join('; ') || response.statusText;
    throw new Error(`LLDAP GraphQL error (${response.status}): ${detail}`);
  }
  return body.data;
}

function setPassword(userId, password) {
  return new Promise((resolve, reject) => {
    execFile(
      'ldappasswd',
      [
        '-H',
        LLDAP_LDAP_URL,
        '-x',
        '-D',
        LLDAP_ADMIN_DN,
        '-w',
        LLDAP_ADMIN_PASSWORD,
        '-s',
        password,
        userDn(userId),
      ],
      (error, _stdout, stderr) => {
        if (error) {
          reject(new Error(`Failed to set LLDAP password: ${stderr || error.message}`));
          return;
        }
        resolve(true);
      },
    );
  });
}

async function createUser(email, password) {
  const userId = email.toLowerCase();
  const usernamePart = userId.split('@')[0];

  await graphql(
    `mutation($u: CreateUserInput!) { createUser(user: $u) { id email } }`,
    {
      u: {
        id: userId,
        email: userId,
        displayName: usernamePart,
      },
    },
  ).catch((err) => {
    if (/already exists|duplicate|UNIQUE/i.test(err.message)) {
      throw new Error('Username/Email is already registered.');
    }
    throw err;
  });

  await setPassword(userId, password);
  return true;
}

async function listUsers() {
  const data = await graphql(`{ users { id email displayName } }`, {});
  return (data.users || [])
    .filter((user) => user.email || user.id)
    .map((user) => ({
      id: user.id,
      username: user.id,
      email: (user.email || user.id || '').toLowerCase(),
      enabled: true,
    }));
}

async function findUserIdByEmail(email) {
  const normalized = email.toLowerCase();
  const users = await listUsers();
  const match = users.find(
    (user) => user.email === normalized || user.id.toLowerCase() === normalized,
  );
  return match?.id || null;
}

async function changePassword(email, password) {
  const userId = await findUserIdByEmail(email);
  if (!userId) {
    throw new Error('Mailbox account not found.');
  }
  await setPassword(userId, password);
  return true;
}

async function deleteUser(email) {
  const userId = await findUserIdByEmail(email);
  if (!userId) return false;
  await graphql(`mutation($id: String!) { deleteUser(userId: $id) { ok } }`, { id: userId });
  return true;
}

module.exports = {
  createUser,
  changePassword,
  listUsers,
  deleteUser,
  findUserIdByEmail,
};
