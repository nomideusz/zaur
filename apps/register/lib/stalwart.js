const JMAP_CAPABILITIES = [
  'urn:ietf:params:jmap:core',
  'urn:ietf:params:jmap:mail',
  'urn:stalwart:jmap',
];

const DOMAIN_CACHE_TTL_MS = 5 * 60 * 1000;
const STANDARD_MAILBOXES = [
  { name: 'E-mails', role: 'inbox', sortOrder: 10 },
  { name: 'Spam', role: 'junk', sortOrder: 20 },
  { name: 'Drafts', role: 'drafts', sortOrder: 30 },
  { name: 'Sent', role: 'sent', sortOrder: 40 },
  { name: 'Archive', role: 'archive', sortOrder: 50 },
  { name: 'Trash', role: 'trash', sortOrder: 60 },
  { name: 'Important', role: null, sortOrder: 70 },
  { name: 'Scheduled', role: null, sortOrder: 80 },
  { name: 'Memos', role: null, sortOrder: 90 },
  { name: 'Snoozed', role: null, sortOrder: 100 },
];

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

let cachedLdapDirectoryId = null;

async function getLdapDirectoryId() {
  if (cachedLdapDirectoryId) return cachedLdapDirectoryId;

  const { body } = await jmapRequest([['x:Directory/query', {}, 'directoryQuery']]);
  const query = getMethodResponse(body, 'directoryQuery');
  if (!query?.ids?.length) return null;

  const { body: getBody } = await jmapRequest([
    ['x:Directory/get', { ids: query.ids }, 'directoryGet'],
  ]);
  const getResponse = getMethodResponse(getBody, 'directoryGet');
  const directories = getResponse?.list || [];
  const list = Array.isArray(directories) ? directories : Object.values(directories);
  const ldap = list.find((entry) => entry['@type'] === 'Ldap');
  cachedLdapDirectoryId = ldap?.id || null;
  return cachedLdapDirectoryId;
}

async function ensureDomainInternalDirectory(domainId) {
  const { body: domainGetBody } = await jmapRequest([['x:Domain/get', { ids: [domainId] }, 'domainGet']]);
  const getResponse = getMethodResponse(domainGetBody, 'domainGet');
  const domain = getResponse?.list?.[0];
  if (!domain) return false;
  if (domain.directoryId === null) return true;

  const { body: setBody } = await jmapRequest([
    ['x:Domain/set', { update: { [domainId]: { directoryId: null } } }, 'domainSet'],
  ]);
  const setResponse = getMethodResponse(setBody, 'domainSet');
  if (setResponse?.notUpdated?.[domainId]) {
    throw new Error(extractJmapError(setResponse));
  }

  domainCache.expiresAt = 0;
  return true;
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
  if (response?.ids?.length) return false;

  const aliases = await findAliasMatches(username, domainId);
  return aliases.length === 0;
}

async function findAliasMatches(username, domainId) {
  const { body } = await jmapRequest([
    ['x:Account/query', { filter: {} }, 'aliasAccountQuery'],
  ]);

  const query = getMethodResponse(body, 'aliasAccountQuery');
  if (!query?.ids?.length) return [];

  const { body: getBody } = await jmapRequest([
    [
      'x:Account/get',
      {
        ids: query.ids,
        properties: ['id', 'name', 'domainId', 'aliases'],
      },
      'aliasAccountGet',
    ],
  ]);

  const get = getMethodResponse(getBody, 'aliasAccountGet');
  const accounts = Array.isArray(get?.list) ? get.list : Object.values(get?.list || {});
  const normalized = username.toLowerCase();

  return accounts.filter((account) => {
    const aliases = Array.isArray(account.aliases)
      ? account.aliases
      : Object.values(account.aliases || {});

    return aliases.some(
      (alias) =>
        alias?.enabled !== false &&
        alias?.domainId === domainId &&
        typeof alias?.name === 'string' &&
        alias.name.toLowerCase() === normalized,
    );
  });
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

async function listAccounts() {
  const domains = await listDomains();
  const domainsById = new Map(domains.map((domain) => [domain.id, domain.name]));

  const { body } = await jmapRequest([
    ['x:Account/query', { filter: {} }, 'accountQuery'],
  ]);

  const query = getMethodResponse(body, 'accountQuery');
  if (!query?.ids?.length) return [];

  const { body: getBody } = await jmapRequest([
    [
      'x:Account/get',
      {
        ids: query.ids,
        properties: ['id', 'name', 'domainId', 'emailAddress', 'aliases'],
      },
      'accountGet',
    ],
  ]);

  const get = getMethodResponse(getBody, 'accountGet');
  const accounts = Array.isArray(get?.list) ? get.list : Object.values(get?.list || {});

  return accounts.map((account) => ({
    id: account.id,
    name: account.name,
    domainId: account.domainId,
    domain: domainsById.get(account.domainId) || null,
    email: account.emailAddress || `${account.name}@${domainsById.get(account.domainId) || 'unknown'}`,
    aliases: (Array.isArray(account.aliases) ? account.aliases : Object.values(account.aliases || {}))
      .filter((alias) => alias?.enabled !== false)
      .map((alias) => ({
        name: alias.name,
        domainId: alias.domainId,
        domain: domainsById.get(alias.domainId) || null,
        email: `${alias.name}@${domainsById.get(alias.domainId) || 'unknown'}`,
      })),
  }));
}

async function findAccountByEmail(email) {
  const normalized = email.toLowerCase();
  const accounts = await listAccounts();
  return accounts.find((account) => account.email.toLowerCase() === normalized) || null;
}

async function createAccount(username, domainId, password) {
  await ensureDomainInternalDirectory(domainId);

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
            quotas: {
              maxDiskQuota: config.maxDiskQuota,
            },
            roles: { '@type': 'User' },
            permissions: { '@type': 'Inherit' },
            encryptionAtRest: { '@type': 'Disabled' },
            aliases: {},
            memberGroupIds: {},
            credentials: {
              "0": {
                "secret": password,
                "@type": "Password"
              }
            }
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

async function deleteAccount(accountId) {
  if (!accountId) return false;

  const { body } = await jmapRequest([
    [
      'x:Account/set',
      {
        destroy: [accountId],
      },
      'deleteAccount',
    ],
  ]);

  const response = getMethodResponse(body, 'deleteAccount');
  if (response?.notDestroyed?.[accountId]) {
    throw new Error(extractJmapError(response));
  }
  return response?.destroyed?.includes(accountId) ?? false;
}

async function deleteAccountByEmail(email) {
  const account = await findAccountByEmail(email);
  if (!account) return false;
  return deleteAccount(account.id);
}

async function ensureStandardMailboxes(accountId) {
  const { body: mailboxGetBody } = await jmapRequest([
    ['Mailbox/get', { accountId, properties: ['id', 'name', 'role'] }, 'mailboxes'],
  ]);
  const mailboxResponse = getMethodResponse(mailboxGetBody, 'mailboxes');
  const existing = Array.isArray(mailboxResponse?.list) ? mailboxResponse.list : [];
  const existingRoles = new Set(existing.map((mailbox) => mailbox.role).filter(Boolean));
  const existingNames = new Set(existing.map((mailbox) => mailbox.name?.toLowerCase()).filter(Boolean));

  const create = {};
  for (const mailbox of STANDARD_MAILBOXES) {
    if (mailbox.role && existingRoles.has(mailbox.role)) continue;
    if (existingNames.has(mailbox.name.toLowerCase())) continue;
    const key = mailbox.role || mailbox.name.toLowerCase().replace(/\s+/g, '-');
    create[key] = {
      name: mailbox.name,
      parentId: null,
      sortOrder: mailbox.sortOrder,
      isSubscribed: true,
      ...(mailbox.role ? { role: mailbox.role } : {}),
    };
  }

  if (!Object.keys(create).length) return [];

  const { body: mailboxSetBody } = await jmapRequest([
    ['Mailbox/set', { accountId, create }, 'mailboxSet'],
  ]);
  const setResponse = getMethodResponse(mailboxSetBody, 'mailboxSet');
  if (setResponse?.notCreated && Object.keys(setResponse.notCreated).length) {
    throw new Error(extractJmapError(setResponse));
  }
  return Object.keys(setResponse?.created || {});
}

async function changePassword(email, password) {
  const account = await findAccountByEmail(email);
  if (!account) {
    throw new Error('Account not found in Stalwart.');
  }

  const { body } = await jmapRequest([
    [
      'x:Account/set',
      {
        update: {
          [account.id]: {
            credentials: {
              "0": {
                "secret": password,
                "@type": "Password"
              }
            }
          }
        }
      },
      'changePassword',
    ],
  ]);

  const response = getMethodResponse(body, 'changePassword');
  if (response?.notUpdated?.[account.id]) {
    throw new Error(extractJmapError(response));
  }
  return true;
}

module.exports = {
  listDomains,
  listAccounts,
  findAccountByEmail,
  checkUsernameAcrossDomains,
  createAccount,
  deleteAccount,
  deleteAccountByEmail,
  ensureStandardMailboxes,
  changePassword,
  clearDomainCache: () => {
    domainCache = { domains: null, expiresAt: 0 };
  },
};
