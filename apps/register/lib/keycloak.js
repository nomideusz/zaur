const KEYCLOAK_URL = (process.env.KEYCLOAK_URL || 'http://srv-captain--keycloak:8080').replace(/\/$/, '');
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'master';
const KEYCLOAK_USER = process.env.KEYCLOAK_ADMIN_USER;
const KEYCLOAK_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD;

async function getAdminToken() {
  if (!KEYCLOAK_USER || !KEYCLOAK_PASSWORD) {
    throw new Error('Keycloak admin credentials are not configured in environment.');
  }

  const params = new URLSearchParams();
  params.append('client_id', 'admin-cli');
  params.append('username', KEYCLOAK_USER);
  params.append('password', KEYCLOAK_PASSWORD);
  params.append('grant_type', 'password');

  const tokenUrl = `${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token`;
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to obtain Keycloak admin token: ${response.status} ${errText}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function createUser(email, password) {
  const token = await getAdminToken();
  const usersUrl = `${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users`;

  const userPayload = {
    username: email.toLowerCase(),
    email: email.toLowerCase(),
    enabled: true,
    emailVerified: true,
    credentials: [
      {
        type: 'password',
        value: password,
        temporary: false,
      },
    ],
  };

  const response = await fetch(usersUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userPayload),
  });

  if (response.status === 409) {
    throw new Error('Username/Email is already registered in Keycloak.');
  }

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Keycloak user creation failed (${response.status}): ${errText}`);
  }

  return true;
}

async function listUsers() {
  const token = await getAdminToken();
  const users = [];
  let first = 0;
  const max = 100;

  while (true) {
    const usersUrl = new URL(`${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users`);
    usersUrl.searchParams.set('first', String(first));
    usersUrl.searchParams.set('max', String(max));

    const response = await fetch(usersUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Keycloak user list failed (${response.status}): ${errText}`);
    }

    const page = await response.json();
    users.push(...page);
    if (page.length < max) break;
    first += max;
  }

  return users
    .filter((user) => user.email || user.username)
    .map((user) => ({
      id: user.id,
      username: user.username,
      email: (user.email || user.username || '').toLowerCase(),
      enabled: user.enabled !== false,
    }));
}

async function findUserIdByEmail(email) {
  const token = await getAdminToken();
  const usersUrl = new URL(`${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users`);
  usersUrl.searchParams.set('email', email.toLowerCase());
  usersUrl.searchParams.set('exact', 'true');

  const response = await fetch(usersUrl, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Keycloak user lookup failed (${response.status}): ${errText}`);
  }

  const users = await response.json();
  const match = users.find(
    (user) =>
      user.email?.toLowerCase() === email.toLowerCase() ||
      user.username?.toLowerCase() === email.toLowerCase(),
  );
  return match?.id || null;
}

async function deleteUser(email) {
  const token = await getAdminToken();
  const userId = await findUserIdByEmail(email);
  if (!userId) return false;

  const response = await fetch(`${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users/${userId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    const errText = await response.text();
    throw new Error(`Keycloak user cleanup failed (${response.status}): ${errText}`);
  }
  return true;
}

async function getUserBearerToken(email, password) {
  const params = new URLSearchParams();
  params.append('client_id', 'webmail');
  params.append('username', email.toLowerCase());
  params.append('password', password);
  params.append('grant_type', 'password');
  params.append('scope', 'openid profile email');

  const tokenUrl = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`;
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to obtain user token from Keycloak: ${response.status} ${errText}`);
  }

  const data = await response.json();
  return data.access_token;
}

module.exports = {
  createUser,
  listUsers,
  deleteUser,
  findUserIdByEmail,
  getUserBearerToken,
};

