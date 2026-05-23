const JMAP_CAPABILITIES = ['urn:ietf:params:jmap:core', 'urn:stalwart:jmap'];

const DOMAIN_CACHE_TTL_MS = 5 * 60 * 1000;

let domainCache = { domains: null, expiresAt: 0 };

function getConfig() {
  const url = process.env.STALWART_URL;
  if (!url) {
    throw new Error('STALWART_URL is not configured.');
  }

  const jmapPath = process.env.STALWART_JMAP_PATH || '/jmap';
  const token = process.env.STALWART_TOKEN;
  const user = process.env.STALWART_ADMIN_USER;
  const password = process.env.STALWART_ADMIN_PASSWORD;

  if (!token && (!user || !password)) {
    throw new Error('STALWART_TOKEN or STALWART_ADMIN_USER/PASSWORD must be configured.');
  }

  return {
    jmapUrl: `${url.replace(/\/$/, '')}${jmapPath.startsWith('/') ? jmapPath : `/${jmapPath}`}`,
    token,
    user,
    password,
    maxDiskQuota: Number.parseInt(process.env.MAX_DISK_QUOTA || '524288000', 10),
    allowlist: (process.env.REGISTRATION_DOMAINS || '')
      .split(',')
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean),
  };
}

function buildAuthHeaders(config) {
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };

  if (config.token) {
    headers.Authorization = `Bearer ${config.token}`;
  } else {
    const encoded = Buffer.from(`${config.user}:${config.password}`).toString('base64');
    headers.Authorization = `Basic ${encoded}`;
  }

  return headers;
}

async function jmapRequest(methodCalls) {
  const config = getConfig();
  const response = await fetch(config.jmapUrl, {
    method: 'POST',
    headers: buildAuthHeaders(config),
    body: JSON.stringify({
      using: JMAP_CAPABILITIES,
      methodCalls,
    }),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = body.detail || body.title || response.statusText;
    throw new Error(`Stalwart JMAP error (${response.status}): ${detail}`);
  }

  return { body, config };
}

function getMethodResponse(body, callId) {
  for (const call of body.methodResponses || []) {
    if (call[2] === callId) {
      return call[1];
    }
  }
  return null;
}

function extractJmapError(response) {
  if (!response) return 'Unknown Stalwart error.';

  if (response.notCreated) {
    for (const entry of Object.values(response.notCreated)) {
      if (entry?.description) return entry.description;
      if (entry?.type) return entry.type;
    }
  }

  if (response.notUpdated) {
    for (const entry of Object.values(response.notUpdated)) {
      if (entry?.description) return entry.description;
    }
  }

  return 'Account creation failed.';
}

function filterDomains(domains, allowlist) {
  const enabled = domains.filter((d) => d.isEnabled !== false);
  if (allowlist.length === 0) return enabled;
  return enabled.filter((d) => allowlist.includes(d.name.toLowerCase()));
}

async function listDomains(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && domainCache.domains && domainCache.expiresAt > now) {
    return domainCache.domains;
  }

  const { body, config } = await jmapRequest([
    ['x:Domain/query', { filter: {} }, 'domains'],
  ]);

  const response = getMethodResponse(body, 'domains');
  if (!response?.ids?.length) {
    domainCache = { domains: [], expiresAt: now + DOMAIN_CACHE_TTL_MS };
    return [];
  }

  const { body: getBody } = await jmapRequest([
    ['x:Domain/get', { ids: response.ids }, 'domainGet'],
  ]);

  const getResponse = getMethodResponse(getBody, 'domainGet');
  const domainList = getResponse?.list || [];
  const rawDomains = (Array.isArray(domainList) ? domainList : Object.values(domainList)).map((d) => ({
    id: d.id,
    name: d.name,
    isEnabled: d.isEnabled,
  }));

  const domains = filterDomains(rawDomains, config.allowlist).map(({ id, name }) => ({ id, name }));

  domainCache = { domains, expiresAt: now + DOMAIN_CACHE_TTL_MS };
  return domains;
}

async function isUsernameAvailable(username, domainId) {
  const { body } = await jmapRequest([
    [
      'x:Account/query',
      {
        filter: {
          name: username,
          domainId,
        },
      },
      `check-${domainId}`,
    ],
  ]);

  const response = getMethodResponse(body, `check-${domainId}`);
  return !response?.ids?.length;
}

async function checkUsernameAcrossDomains(username) {
  const domains = await listDomains();
  const results = await Promise.all(
    domains.map(async (domain) => {
      const available = await isUsernameAvailable(username, domain.id);
      return {
        domain: domain.name,
        domainId: domain.id,
        available,
      };
    }),
  );

  return results;
}

async function createAccount(username, domainId, password) {
  const config = getConfig();

  const { body } = await jmapRequest([
    [
      'x:Account/set',
      {
        create: {
          newUser: {
            '@type': 'User',
            name: username,
            domainId,
            locale: 'pl_PL',
            timeZone: 'Europe/Warsaw',
            credentials: {
              '0': {
                '@type': 'Password',
                secret: password,
              },
            },
            quotas: {
              maxDiskQuota: config.maxDiskQuota,
            },
            roles: { '@type': 'User' },
            permissions: { '@type': 'Inherit' },
            encryptionAtRest: { '@type': 'Disabled' },
            aliases: {},
            memberGroupIds: {},
          },
        },
      },
      'createAccount',
    ],
  ]);

  const response = getMethodResponse(body, 'createAccount');

  if (response?.notCreated?.newUser) {
    throw new Error(extractJmapError(response));
  }

  const created = response?.created?.newUser;
  if (!created) {
    throw new Error(extractJmapError(response));
  }

  const domains = await listDomains();
  const domain = domains.find((d) => d.id === domainId);
  const email = created.emailAddress || `${username}@${domain?.name || 'unknown'}`;

  return { email, accountId: created.id };
}

module.exports = {
  listDomains,
  checkUsernameAcrossDomains,
  createAccount,
  clearDomainCache: () => {
    domainCache = { domains: null, expiresAt: 0 };
  },
};
