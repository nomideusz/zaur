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

module.exports = {
  createUser,
};
