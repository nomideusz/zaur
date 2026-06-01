const LOGTO_ENDPOINT = (process.env.LOGTO_ENDPOINT || 'https://auth.zaur.app').replace(/\/$/, '');
const LOGTO_API_RESOURCE =
  process.env.LOGTO_API_RESOURCE || 'https://default.logto.app/api';
const LOGTO_M2M_CLIENT_ID = process.env.LOGTO_M2M_CLIENT_ID?.trim();
const LOGTO_M2M_CLIENT_SECRET = process.env.LOGTO_M2M_CLIENT_SECRET?.trim();

let cachedToken = null;

function isConfigured() {
  return Boolean(LOGTO_M2M_CLIENT_ID && LOGTO_M2M_CLIENT_SECRET);
}

async function getAccessToken() {
  if (!isConfigured()) {
    throw new Error('Logto M2M credentials are not configured.');
  }

  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.value;
  }

  const credentials = Buffer.from(`${LOGTO_M2M_CLIENT_ID}:${LOGTO_M2M_CLIENT_SECRET}`).toString(
    'base64',
  );

  const response = await fetch(`${LOGTO_ENDPOINT}/oidc/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      resource: LOGTO_API_RESOURCE,
      scope: 'all',
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Logto token request failed (${response.status}): ${errText}`);
  }

  const data = await response.json();
  cachedToken = {
    value: data.access_token,
    expiresAt: now + (data.expires_in || 3600) * 1000,
  };
  return data.access_token;
}

async function managementRequest(method, path, body) {
  const token = await getAccessToken();
  const response = await fetch(`${LOGTO_ENDPOINT}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) {
    return null;
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const issueDetails = payload.data?.issues
      ?.map((issue) => {
        const path = issue.path?.length ? issue.path.join('.') : 'body';
        return `${path}: ${issue.message || issue.code || 'invalid'}`;
      })
      .join('; ');
    const detail =
      issueDetails ||
      payload.details ||
      payload.message ||
      payload.error ||
      (Array.isArray(payload) ? payload.map((item) => item.message).join('; ') : null) ||
      response.statusText;
    throw new Error(`Logto API ${method} ${path} failed (${response.status}): ${detail}`);
  }

  return payload;
}

async function findUserByEmail(email) {
  const normalized = email.toLowerCase();
  const query = new URLSearchParams({
    search: normalized,
    page: '1',
    page_size: '20',
  });
  const users = await managementRequest('GET', `/api/users?${query.toString()}`);
  if (!Array.isArray(users)) return null;
  return users.find((user) => user.primaryEmail?.toLowerCase() === normalized) || null;
}

async function createUser(email, password, options = {}) {
  const normalized = email.toLowerCase();
  const recoveryEmail = options.recoveryEmail?.trim().toLowerCase();
  const customData =
    recoveryEmail && recoveryEmail !== normalized ? { recoveryEmail } : undefined;

  try {
    const created = await managementRequest('POST', '/api/users', {
      primaryEmail: normalized,
      name: normalized.split('@')[0],
      ...(customData ? { customData } : {}),
    });

    if (!created?.id) {
      throw new Error('Logto user was created without an id.');
    }

    await managementRequest('PATCH', `/api/users/${created.id}/password`, { password });

    const verified = await managementRequest('GET', `/api/users/${created.id}`);
    if (!verified?.hasPassword) {
      throw new Error('Logto password was not set for the new user.');
    }

    return true;
  } catch (err) {
    if (/already exists|duplicate|409|already in use/i.test(err.message)) {
      throw new Error('This email is already registered for sign-in.');
    }
    throw err;
  }
}

const PASSKEY_SETUP_TOKEN_EXPIRES_SEC = Number.parseInt(
  process.env.PASSKEY_SETUP_TOKEN_EXPIRES_SEC || '900',
  10,
);

async function createOneTimeToken(email, expiresInSec = 72 * 3600) {
  return managementRequest('POST', '/api/one-time-tokens', {
    email: email.toLowerCase(),
    expiresIn: expiresInSec,
  });
}

async function createPasskeySetupToken(email) {
  return createOneTimeToken(email, PASSKEY_SETUP_TOKEN_EXPIRES_SEC);
}

async function verifyOneTimeToken(email, token) {
  return managementRequest('POST', '/api/one-time-tokens/verify', {
    email: email.toLowerCase(),
    token: String(token).trim(),
  });
}

async function listOneTimeTokens() {
  const tokens = await managementRequest('GET', '/api/one-time-tokens?page=1&page_size=100');
  return Array.isArray(tokens) ? tokens : [];
}

async function findOneTimeTokens(token) {
  const cleanToken = String(token || '').trim();
  const tokens = await listOneTimeTokens();
  return tokens.filter((item) => item.token === cleanToken);
}

async function deleteOneTimeToken(id) {
  await managementRequest('DELETE', `/api/one-time-tokens/${id}`);
  return true;
}

async function getUserByEmail(email) {
  const user = await findUserByEmail(email);
  if (!user?.id) return null;
  return managementRequest('GET', `/api/users/${user.id}`);
}

async function updatePassword(email, password) {
  const user = await findUserByEmail(email);
  if (!user?.id) {
    throw new Error('Sign-in account not found.');
  }
  await managementRequest('PATCH', `/api/users/${user.id}/password`, { password });
  return true;
}

async function deleteUser(email) {
  const user = await findUserByEmail(email);
  if (!user?.id) return false;
  await managementRequest('DELETE', `/api/users/${user.id}`);
  return true;
}

module.exports = {
  isConfigured,
  createUser,
  deleteUser,
  findUserByEmail,
  getUserByEmail,
  updatePassword,
  createOneTimeToken,
  createPasskeySetupToken,
  verifyOneTimeToken,
  listOneTimeTokens,
  findOneTimeTokens,
  deleteOneTimeToken,
};
