require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const rateLimit = require('express-rate-limit');

const stalwart = require('./lib/stalwart');
const invites = require('./lib/invites');
const directory = require('./lib/lldap');
const logto = require('./lib/logto');
const {
  validateUsername,
  validatePassword,
  validateCaptchaAnswer,
  generateCaptcha,
} = require('./lib/validation');

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);

app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data:",
      "connect-src 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join('; '),
  );
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(
  session({
    store: new FileStore({
      path: process.env.SESSION_STORE_PATH || path.join(__dirname, '.data', 'sessions'),
      retries: 0,
    }),
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      maxAge: 60 * 60 * 1000,
      sameSite: 'lax',
    },
  }),
);

const checkUsernameLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many availability checks. Please wait a moment.' },
});

const registerHourlyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Registration limit reached. Try again in an hour.' },
});

const registerDailyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Daily registration limit reached. Try again tomorrow.' },
});

app.get('/api/config', (_req, res) => {
  res.json({
    webmailUrl: process.env.WEBMAIL_URL || 'https://webmail.zaur.app',
    mailHost: process.env.MAIL_HOST || 'mail.zaur.app',
  });
});

app.get('/api/domains', async (_req, res) => {
  try {
    const domains = await stalwart.listDomains();
    res.json({ domains });
  } catch (err) {
    console.error('GET /api/domains:', err.message);
    res.status(502).json({ error: 'Unable to load domains. Please try again later.' });
  }
});

app.get('/api/captcha', (req, res) => {
  const captcha = generateCaptcha();
  req.session.captchaAnswer = captcha.answer;
  res.json({ question: captcha.question });
});

app.post('/api/check-username', checkUsernameLimiter, async (req, res) => {
  const validation = validateUsername(req.body.username);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error, results: [] });
  }

  try {
    const results = await stalwart.checkUsernameAcrossDomains(validation.username);
    res.json({ username: validation.username, results });
  } catch (err) {
    console.error('POST /api/check-username:', err.message);
    res.status(502).json({ error: 'Unable to check availability. Please try again later.' });
  }
});

app.post('/api/register', registerHourlyLimiter, registerDailyLimiter, async (req, res) => {
  const { username, domainId, inviteCode, password, confirmPassword, captchaAnswer } = req.body;

  const inviteValidation = invites.validateInvite(inviteCode);
  if (!inviteValidation.valid) {
    return res.status(400).json({ error: inviteValidation.error });
  }

  const usernameValidation = validateUsername(username);
  if (!usernameValidation.valid) {
    return res.status(400).json({ error: usernameValidation.error });
  }

  const passwordValidation = validatePassword(password, confirmPassword);
  if (!passwordValidation.valid) {
    return res.status(400).json({ error: passwordValidation.error });
  }

  const captchaValidation = validateCaptchaAnswer(captchaAnswer, req.session.captchaAnswer);
  if (!captchaValidation.valid) {
    return res.status(400).json({ error: captchaValidation.error });
  }

  if (!domainId) {
    return res.status(400).json({ error: 'Please select a domain.' });
  }

  try {
    const domains = await stalwart.listDomains();
    const domain = domains.find((d) => d.id === domainId);
    if (!domain) {
      return res.status(400).json({ error: 'Invalid domain selected.' });
    }

    const email = `${usernameValidation.username}@${domain.name}`;

    const available = await stalwart.checkUsernameAcrossDomains(usernameValidation.username);
    const selected = available.find((r) => r.domainId === domainId);
    if (!selected?.available) {
      return res.status(409).json({ error: 'This email address is no longer available.' });
    }

    const inviteReservation = invites.reserveInvite(inviteCode, email);
    if (!inviteReservation.valid) {
      return res.status(409).json({ error: inviteReservation.error });
    }

    let accountId = null;
    let directoryCreated = false;
    let logtoCreated = false;

    try {
      // 1. Create the LLDAP user (single source of truth for the mailbox password)
      await directory.createUser(email, password);
      directoryCreated = true;

      // 2. Create matching Logto user for webmail passkey / OIDC sign-in
      if (logto.isConfigured()) {
        await logto.createUser(email, password);
        logtoCreated = true;
      }

      // 3. Create Stalwart account representation (credentials live in LLDAP)
      const account = await stalwart.createAccount(
        usernameValidation.username,
        domainId,
      );
      accountId = account.accountId;

      // 4. Provision standard mailboxes via admin JMAP (user password auth uses LLDAP,
      //    which is unavailable while Logto OIDC is Stalwart's default Bearer directory)
      await stalwart.ensureStandardMailboxes(accountId);

      if (!invites.markInviteAsUsed(inviteCode, email)) {
        throw new Error('Account was created, but the invitation code could not be marked as used.');
      }
    } catch (err) {
      const cleanupErrors = [];
      if (logtoCreated) {
        try {
          await logto.deleteUser(email);
        } catch (cleanupErr) {
          cleanupErrors.push(`Logto cleanup failed: ${cleanupErr.message}`);
        }
      }
      if (directoryCreated) {
        try {
          await directory.deleteUser(email);
        } catch (cleanupErr) {
          cleanupErrors.push(`LLDAP cleanup failed: ${cleanupErr.message}`);
        }
      }
      if (accountId) {
        try {
          await stalwart.deleteAccount(accountId);
        } catch (cleanupErr) {
          cleanupErrors.push(`Stalwart cleanup failed: ${cleanupErr.message}`);
        }
      }

      if (!cleanupErrors.length) {
        invites.releaseInviteReservation(inviteCode);
      }

      if (cleanupErrors.length) {
        console.error('Registration cleanup errors:', cleanupErrors.join('; '));
      }

      throw err;
    }

    delete req.session.captchaAnswer;

    res.json({
      success: true,
      email,
      webmailUrl: process.env.WEBMAIL_URL || 'https://webmail.zaur.app',
      mailHost: process.env.MAIL_HOST || 'mail.zaur.app',
    });
  } catch (err) {
    console.error('POST /api/register:', err.message);
    const captcha = generateCaptcha();
    req.session.captchaAnswer = captcha.answer;
    res.status(400).json({ error: err.message, captcha: captcha.question });
  }
});

function requireAdmin(req, res, next) {
  if (!process.env.ADMIN_PASSWORD) {
    return res.status(403).json({ error: 'Admin panel is disabled.' });
  }
  if (!req.session.isAdmin) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  next();
}

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  const adminPass = process.env.ADMIN_PASSWORD;

  if (!adminPass) {
    return res.status(403).json({ error: 'Admin panel is disabled.' });
  }

  if (password === adminPass) {
    req.session.isAdmin = true;
    return res.json({ success: true });
  } else {
    return res.status(401).json({ error: 'Invalid admin password.' });
  }
});

app.post('/api/admin/logout', (req, res) => {
  req.session.isAdmin = false;
  res.json({ success: true });
});

app.get('/api/admin/status', (req, res) => {
  const adminEnabled = !!process.env.ADMIN_PASSWORD;
  res.json({
    enabled: adminEnabled,
    authenticated: adminEnabled && !!req.session.isAdmin
  });
});

app.get('/api/admin/invites', requireAdmin, (req, res) => {
  try {
    invites.cleanupPendingReservations();
    const list = invites.readInvites();
    res.json({ invites: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/invites/cleanup-pending', requireAdmin, (_req, res) => {
  try {
    const changed = invites.cleanupPendingReservations();
    res.json({ success: true, changed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function getProvisioningAudit() {
  const [mailAccounts, directoryUsers] = await Promise.all([
    stalwart.listAccounts(),
    directory.listUsers(),
  ]);

  const mailEmails = new Set(mailAccounts.map((account) => account.email.toLowerCase()));
  const aliasEmails = new Set(
    mailAccounts.flatMap((account) => account.aliases || []).map((alias) => alias.email.toLowerCase()),
  );
  const directoryEmails = new Set(directoryUsers.map((user) => user.email.toLowerCase()));

  const directoryOnly = directoryUsers.filter((user) => !mailEmails.has(user.email) && !aliasEmails.has(user.email));
  const stalwartOnly = mailAccounts.filter((account) => !directoryEmails.has(account.email.toLowerCase()));

  return {
    counts: {
      stalwartAccounts: mailAccounts.length,
      directoryUsers: directoryUsers.length,
      directoryOnly: directoryOnly.length,
      stalwartOnly: stalwartOnly.length,
    },
    directoryOnly,
    stalwartOnly,
  };
}

app.get('/api/admin/audit', requireAdmin, async (_req, res) => {
  try {
    res.json(await getProvisioningAudit());
  } catch (err) {
    console.error('GET /api/admin/audit:', err.message);
    res.status(502).json({ error: err.message });
  }
});

app.post('/api/admin/cleanup-account', requireAdmin, async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const target = req.body.target;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  if (!['directory', 'logto', 'stalwart', 'both', 'all'].includes(target)) {
    return res.status(400).json({
      error: 'Cleanup target must be directory, logto, stalwart, both, or all.',
    });
  }

  try {
    const result = {};
    if (target === 'directory' || target === 'both' || target === 'all') {
      result.directory = await directory.deleteUser(email);
    }
    if (target === 'logto' || target === 'all') {
      result.logto = logto.isConfigured() ? await logto.deleteUser(email) : false;
    }
    if (target === 'stalwart' || target === 'both' || target === 'all') {
      result.stalwart = await stalwart.deleteAccountByEmail(email);
    }
    res.json({ success: true, result });
  } catch (err) {
    console.error('POST /api/admin/cleanup-account:', err.message);
    res.status(502).json({ error: err.message });
  }
});

app.post('/api/admin/invites/generate', requireAdmin, (req, res) => {
  const count = parseInt(req.body.count || '1', 10);
  if (isNaN(count) || count <= 0) {
    return res.status(400).json({ error: 'Invalid count.' });
  }

  try {
    const currentInvites = invites.readInvites();
    const newCodes = [];

    const generateRandomCode = () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const segment = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      return `zaur-${segment()}-${segment()}-${segment()}`;
    };

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
    res.json({ success: true, codes: newCodes.map(c => c.code) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/invites/revoke', requireAdmin, (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Code is required.' });
  }

  try {
    const list = invites.readInvites();
    const found = list.find((c) => c.code === code.trim());

    if (!found) {
      return res.status(404).json({ error: 'Invite code not found.' });
    }

    if (found.used) {
      return res.status(400).json({ error: 'Invite code has already been used and cannot be revoked.' });
    }

    found.revoked = true;
    invites.writeInvites(list);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/register', (_req, res) => {
  res.redirect('/');
});

app.get('/success', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'success.html'));
});

app.use(express.static(path.join(__dirname, 'public')));

app.use((_req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Registration portal listening on port ${PORT}`);
});
