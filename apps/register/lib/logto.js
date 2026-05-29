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
    const detail =
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

function logtoUsername(email) {
  const normalized = email.toLowerCase();
  const [local, domain] = normalized.split('@');
  if (!local || !domain) return normalized.replace(/[^a-z0-9._-]/g, '_');
  // Logto usernames are tenant-wide; include domain so user@a and user@b don't collide.
  return `${local}__${domain.replace(/\./g, '-')}`;
}

async function createUser(email, password) {
  const normalized = email.toLowerCase();
  const username = logtoUsername(normalized);

  try {
    await managementRequest('POST', '/api/users', {
      primaryEmail: normalized,
      username,
      name: normalized.split('@')[0],
      password,
    });
    return true;
  } catch (err) {
    if (/already exists|duplicate|409|already in use/i.test(err.message)) {
      throw new Error('This email is already registered for sign-in.');
    }
    throw err;
  }
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
};
