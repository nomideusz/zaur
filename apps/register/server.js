require('dotenv').config();

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const rateLimit = require('express-rate-limit');

const stalwart = require('./lib/stalwart');
const invitations = require('./lib/invitations');
const inviteMail = require('./lib/invite-mail');
const passwordReset = require('./lib/password-reset');
const {
  validateUsername,
  validatePassword,
  validateCaptchaAnswer,
  generateCaptcha,
} = require('./lib/validation');
const { getSiteConfig } = require('./lib/site-config');

const siteConfig = getSiteConfig();

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && !process.env.SESSION_SECRET?.trim()) {
  throw new Error('SESSION_SECRET must be set in production');
}

// Fixed-time compare over sha256 digests so neither the password nor its length leaks via timing.
function constantTimeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

app.set('trust proxy', 1);

app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self'",
      "font-src 'self'",
      "img-src 'self' data:",
      "connect-src 'self'",
      `form-action 'self' ${siteConfig.webmailLoginUrl}`,
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

const INTERNAL_NONCES_PATH =
  process.env.INTERNAL_NONCES_PATH || '/app/data/internal_request_nonces.json';

function consumeInternalNonce(nonce, now) {
  try {
    fs.mkdirSync(path.dirname(INTERNAL_NONCES_PATH), { recursive: true });
    let entries = [];
    if (fs.existsSync(INTERNAL_NONCES_PATH)) {
      entries = JSON.parse(fs.readFileSync(INTERNAL_NONCES_PATH, 'utf8'));
    }
    entries = entries.filter(
      (entry) => Number.isFinite(entry.seenAt) && now - entry.seenAt <= 5 * 60 * 1000,
    );
    if (entries.some((entry) => entry.nonce === nonce)) return false;
    entries.push({ nonce, seenAt: now });
    const tempPath = `${INTERNAL_NONCES_PATH}.${crypto.randomBytes(6).toString('hex')}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(entries.slice(-2000)), 'utf8');
    fs.renameSync(tempPath, INTERNAL_NONCES_PATH);
    return true;
  } catch (err) {
    console.error('Failed to persist internal request nonce:', err.message);
    return false;
  }
}

function requireInternalWebmail(req, res, next) {
  const secret = process.env.WEBMAIL_INTERNAL_SECRET?.trim();
  const timestamp = req.get('x-zaur-timestamp') || '';
  const nonce = req.get('x-zaur-nonce') || '';
  const signature = req.get('x-zaur-signature') || '';
  const parsedTimestamp = Number(timestamp);
  if (
    !secret ||
    !/^[A-Za-z0-9_-]{16,64}$/.test(nonce) ||
    !Number.isFinite(parsedTimestamp) ||
    Math.abs(Date.now() - parsedTimestamp) > 5 * 60 * 1000
  ) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const body = req.method === 'GET' ? '' : JSON.stringify(req.body || {});
  const bodyHash = crypto.createHash('sha256').update(body).digest('hex');
  const payload = `${timestamp}.${nonce}.${req.method}.${req.originalUrl}.${bodyHash}`;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  if (!constantTimeEqual(signature, expected)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!consumeInternalNonce(nonce, Date.now())) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.setHeader('Cache-Control', 'no-store');
  next();
}

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

const applyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many applications. Please try again in an hour.' },
});

const forgotPasswordIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many reset requests. Please wait a few minutes.' },
});

const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in a few minutes.' },
});

const forgotPasswordEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    return email || req.ip;
  },
  message: { error: 'Too many reset requests for this address. Try again later.' },
});

app.get('/api/config', (_req, res) => {
  res.json({
    ...getSiteConfig(),
    requiresInvitation: invitations.requiresInvitation(),
    applicationsEnabled: inviteMail.isConfigured(),
    passwordResetEnabled: passwordReset.isEnabled(),
    passkeySetupEnabled: false,
  });
});

app.get('/site-config.js', (_req, res) => {
  const cfg = getSiteConfig();
  res.type('application/javascript');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.send(`window.ZAUR_SITE=${JSON.stringify(cfg)};`);
});

app.get('/api/invitation', async (req, res) => {
  const token = String(req.query.token || '').trim();
  const email = String(req.query.email || '').trim();

  if (!token || !email) {
    return res.status(400).json({ valid: false, error: 'Invitation link is incomplete.' });
  }

  try {
    const result = await invitations.validateInvitation(email, token);
    if (!result.valid) {
      return res.status(400).json(result);
    }
    return res.json({
      valid: true,
      recoveryEmail: email.toLowerCase(),
    });
  } catch (err) {
    console.error('GET /api/invitation:', err.message);
    return res.status(502).json({ valid: false, error: 'Unable to verify invitation.' });
  }
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
  const {
    username,
    domainId,
    inviteToken,
    inviteEmail,
    password,
    confirmPassword,
    captchaAnswer,
  } = req.body;

  let recoveryEmail = null;
  if (invitations.requiresInvitation()) {
    const token = String(inviteToken || '').trim();
    const email = String(inviteEmail || '').trim();
    const inviteValidation = await invitations.validateInvitation(email, token);
    if (!inviteValidation.valid) {
      return res.status(400).json({ error: inviteValidation.error });
    }
    recoveryEmail = email.toLowerCase();
  }

  const usernameValidation = validateUsername(username);
  if (!usernameValidation.valid) {
    return res.status(400).json({ error: usernameValidation.error });
  }

  const passwordValidation = validatePassword(password, confirmPassword);
  if (!passwordValidation.valid) {
    return res.status(400).json({ error: passwordValidation.error });
  }

  if (!recoveryEmail) {
    const captchaValidation = validateCaptchaAnswer(captchaAnswer, req.session.captchaAnswer);
    if (!captchaValidation.valid) {
      return res.status(400).json({ error: captchaValidation.error });
    }
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

    const inviteReservation = recoveryEmail
      ? await invitations.validateInvitation(recoveryEmail, inviteToken)
      : { valid: true };
    if (!inviteReservation.valid) {
      return res.status(409).json({ error: inviteReservation.error });
    }

    let accountId = null;

    try {
      // 1. Create Stalwart account representation with internal password
      const account = await stalwart.createAccount(
        usernameValidation.username,
        domainId,
        password,
      );
      accountId = account.accountId;

      // 2. Provision standard mailboxes via admin JMAP
      await stalwart.ensureStandardMailboxes(accountId);

      // This address may be a recycled one. Drop any prior tenant's recovery
      // mapping + pending reset links before we record this registration's, so
      // the old owner can't reset the new account. Runs for open + invite signups.
      invitations.purgeMailbox(email);
      passwordReset.revokeTokensForMailbox(email);

      if (recoveryEmail) {
        const consumed = await invitations.consumeInvitation(recoveryEmail, inviteToken);
        if (!consumed.valid) {
          throw new Error(consumed.error || 'Invitation could not be confirmed.');
        }
        invitations.markAuditMailbox(recoveryEmail, email);
      }
    } catch (err) {
      const cleanupErrors = [];
      if (accountId) {
        try {
          await stalwart.deleteAccount(accountId);
        } catch (cleanupErr) {
          cleanupErrors.push(`Stalwart cleanup failed: ${cleanupErr.message}`);
        }
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
      recoveryEmail,
      passkeySetupEnabled: false,
      passkeySetup: null,
      webmailUrl: process.env.WEBMAIL_URL || 'https://webmail.zaur.app',
      mailHost: process.env.MAIL_HOST || 'mail.zaur.app',
    });
  } catch (err) {
    console.error('POST /api/register:', err.message);
    const captcha = generateCaptcha();
    req.session.captchaAnswer = captcha.answer;
    // Don't echo raw pg/JMAP error text (constraint names, directory ids) to the client.
    res.status(400).json({ error: 'Registration could not be completed. Please try again.', captcha: captcha.question });
  }
});

app.post('/api/apply', applyLimiter, async (req, res) => {
  const { username, domainId, name, contactEmail, message, captchaAnswer } = req.body;

  const usernameValidation = validateUsername(username);
  if (!usernameValidation.valid) {
    return res.status(400).json({ error: usernameValidation.error });
  }

  const cleanName = String(name || '').trim();
  if (cleanName.length < 1 || cleanName.length > 100) {
    return res.status(400).json({ error: 'Please enter your name.' });
  }

  const cleanContact = String(contactEmail || '').trim();
  if (!invitations.isValidEmail(cleanContact)) {
    return res.status(400).json({ error: 'A valid contact email is required.' });
  }

  const cleanMessage = String(message || '').trim().slice(0, 2000);

  const captchaValidation = validateCaptchaAnswer(captchaAnswer, req.session.captchaAnswer);
  if (!captchaValidation.valid) {
    return res.status(400).json({ error: captchaValidation.error });
  }

  if (!domainId) {
    return res.status(400).json({ error: 'Please select a domain.' });
  }

  if (!inviteMail.isConfigured()) {
    console.error('POST /api/apply: invitation email is not configured.');
    return res.status(503).json({ error: 'Applications are temporarily unavailable. Please try again later.' });
  }

  try {
    const domains = await stalwart.listDomains();
    const domain = domains.find((d) => d.id === domainId);
    if (!domain) {
      return res.status(400).json({ error: 'Invalid domain selected.' });
    }

    const requestedEmail = `${usernameValidation.username}@${domain.name}`;

    const available = await stalwart.checkUsernameAcrossDomains(usernameValidation.username);
    const selected = available.find((r) => r.domainId === domainId);
    if (!selected?.available) {
      return res.status(409).json({ error: 'This address is already taken. Please choose another.' });
    }

    await inviteMail.sendApplicationEmail({
      requestedEmail,
      name: cleanName,
      contactEmail: cleanContact,
      message: cleanMessage,
    });

    // Rotate the captcha so a fresh challenge is required for any further use.
    const captcha = generateCaptcha();
    req.session.captchaAnswer = captcha.answer;

    res.json({ success: true, requestedEmail });
  } catch (err) {
    console.error('POST /api/apply:', err.message);
    const captcha = generateCaptcha();
    req.session.captchaAnswer = captcha.answer;
    res.status(502).json({
      error: 'Unable to send your application right now. Please try again later.',
      captcha: captcha.question,
    });
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

app.post('/api/admin/login', adminLoginLimiter, (req, res) => {
  const adminPass = process.env.ADMIN_PASSWORD;

  if (!adminPass) {
    return res.status(403).json({ error: 'Admin panel is disabled.' });
  }

  if (constantTimeEqual(String(req.body.password ?? ''), adminPass)) {
    req.session.isAdmin = true;
    return res.json({ success: true });
  }
  return res.status(401).json({ error: 'Invalid admin password.' });
});

app.post('/api/admin/logout', (req, res) => {
  req.session.isAdmin = false;
  res.json({ success: true });
});

app.get('/api/admin/status', (req, res) => {
  const adminEnabled = !!process.env.ADMIN_PASSWORD;
  res.json({
    enabled: adminEnabled,
    authenticated: adminEnabled && !!req.session.isAdmin,
    invitationEmailConfigured: inviteMail.isConfigured(),
  });
});

app.get('/api/admin/invitations', requireAdmin, async (_req, res) => {
  try {
    const list = await invitations.listInvitations();
    res.json({ invitations: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/invitations/send', requireAdmin, async (req, res) => {
  const recoveryEmail = String(req.body.email || '').trim();
  const expiresInHours = Number.parseInt(req.body.expiresInHours || '72', 10);

  if (!invitations.isValidEmail(recoveryEmail)) {
    return res.status(400).json({ error: 'A valid recovery email is required.' });
  }

  try {
    const invitation = await invitations.createInvitation(
      recoveryEmail,
      Math.max(3600, expiresInHours * 3600),
    );

    let emailSent = false;
    let emailError = null;
    if (inviteMail.isConfigured()) {
      try {
        await inviteMail.sendInvitationEmail({
          to: recoveryEmail,
          magicLink: invitation.magicLink,
          expiresAt: invitation.expiresAt,
        });
        emailSent = true;
      } catch (err) {
        emailError = err.message || 'Failed to send invitation email.';
        console.error('POST /api/admin/invitations/send email:', emailError);
      }
    }

    res.json({ success: true, invitation, emailSent, emailError });
  } catch (err) {
    console.error('POST /api/admin/invitations/send:', err.message);
    res.status(502).json({ error: err.message });
  }
});

app.post('/api/admin/invitations/revoke', requireAdmin, async (req, res) => {
  const invitationId = String(req.body.invitationId || '').trim();
  if (!invitationId) {
    return res.status(400).json({ error: 'Invitation id is required.' });
  }

  try {
    await invitations.revokeInvitation(invitationId);
    res.json({ success: true });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.get('/api/internal/recovery', requireInternalWebmail, (req, res) => {
  const mailboxEmail = String(req.query.mailbox || '').trim().toLowerCase();
  if (!invitations.isValidEmail(mailboxEmail)) {
    return res.status(400).json({ error: 'Invalid mailbox' });
  }
  return res.json({
    recoveryEmail: invitations.findRecoveryEmailByMailbox(mailboxEmail),
  });
});

app.post('/api/internal/recovery', requireInternalWebmail, async (req, res) => {
  try {
    const mailboxEmail = String(req.body?.mailboxEmail || '').trim().toLowerCase();
    const recoveryEmail = String(req.body?.recoveryEmail || '').trim().toLowerCase();
    if (!invitations.isValidEmail(mailboxEmail) || !invitations.isValidEmail(recoveryEmail)) {
      return res.status(400).json({ error: 'Valid email addresses are required' });
    }
    await passwordReset.requestRecoveryChange(mailboxEmail, recoveryEmail);
    return res.json({ pending: true });
  } catch (err) {
    console.error('Recovery email change request failed:', err.message);
    return res.status(400).json({ error: 'Could not request recovery email change' });
  }
});

app.get('/api/recovery/verify', (req, res) => {
  const mailboxEmail = String(req.query.email || '').trim().toLowerCase();
  const token = String(req.query.token || '').trim();
  let result = { valid: false };
  try {
    result = passwordReset.confirmRecoveryChange(mailboxEmail, token);
  } catch (err) {
    console.error('Recovery email verification failed:', err.message);
  }
  const target = new URL('/settings/security', siteConfig.webmailUrl || 'https://webmail.zaur.app');
  target.searchParams.set('recovery', result.valid ? 'verified' : 'invalid');
  return res.redirect(303, target.toString());
});

app.post('/api/forgot-password/request', forgotPasswordIpLimiter, forgotPasswordEmailLimiter, async (req, res) => {
  const email = String(req.body.email || '').trim();

  try {
    const result = await passwordReset.requestReset(email);
    res.json(result);
  } catch (err) {
    console.error('POST /api/forgot-password/request:', err.stack || err.message);
    res.status(502).json({ error: 'Unable to send reset instructions right now. Please try again later.' });
  }
});

app.get('/api/forgot-password/verify', forgotPasswordIpLimiter, (req, res) => {
  const email = String(req.query.email || '').trim();
  const token = String(req.query.token || '').trim();
  const result = passwordReset.verifyToken(email, token);
  if (!result.valid) {
    return res.status(400).json(result);
  }
  return res.json(result);
});

app.post('/api/forgot-password/reset', forgotPasswordIpLimiter, async (req, res) => {
  const email = String(req.body.email || '').trim();
  const token = String(req.body.token || '').trim();
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;

  try {
    const result = await passwordReset.resetPassword(email, token, password, confirmPassword);
    if (!result.valid) {
      return res.status(400).json(result);
    }
    return res.json({ success: true, mailboxEmail: result.mailboxEmail });
  } catch (err) {
    // Internal failure details (Stalwart/DB errors) are logged, never returned.
    console.error('POST /api/forgot-password/reset:', err.stack || err.message);
    return res.status(502).json({ error: 'Unable to reset password right now. Please try again later.' });
  }
});

async function getProvisioningAudit() {
  const mailAccounts = await stalwart.listAccounts();

  return {
    counts: {
      stalwartAccounts: mailAccounts.length,
      stalwartOnly: mailAccounts.length,
    },
    stalwartOnly: mailAccounts.map((account) => ({
      email: account.email,
      username: account.name,
      accountId: account.id,
    })),
  };
}

app.get('/api/admin/overview', requireAdmin, async (_req, res) => {
  try {
    const domains = await stalwart.listDomains();
    const accounts = await stalwart.listAccounts();
    const invitationsList = await invitations.listInvitations();

    let smtpStatus = { configured: inviteMail.isConfigured(), ok: null, error: null };
    if (smtpStatus.configured) {
      try {
        await inviteMail.verifySmtp();
        smtpStatus.ok = true;
      } catch (err) {
        smtpStatus.ok = false;
        smtpStatus.error = err.message;
      }
    }

    res.json({
      registrationOpen: process.env.REGISTRATION_OPEN === 'true',
      requiresInvitation: invitations.requiresInvitation(),
      invitationEmailConfigured: inviteMail.isConfigured(),
      smtpStatus,
      passwordResetEnabled: passwordReset.isEnabled(),
      stalwartConfigured: Boolean(process.env.STALWART_URL),
      domains: domains.map((domain) => ({ id: domain.id, name: domain.name })),
      counts: {
        mailboxes: accounts.length,
        domains: domains.length,
        invitations: invitationsList.length,
        invitationsPending: invitationsList.filter((item) =>
          ['sent', 'opened'].includes(item.status),
        ).length,
      },
      ...getSiteConfig(),
    });
  } catch (err) {
    console.error('GET /api/admin/overview:', err.message);
    res.status(502).json({ error: 'Unable to load admin overview.' });
  }
});

app.get('/api/admin/accounts', requireAdmin, async (req, res) => {
  const query = String(req.query.q || '').trim().toLowerCase();

  try {
    let accounts = await stalwart.listAccounts();
    if (query) {
      accounts = accounts.filter((account) => account.email.toLowerCase().includes(query));
    }

    accounts.sort((a, b) => a.email.localeCompare(b.email));

    res.json({
      accounts: accounts.map((account) => ({
        id: account.id,
        email: account.email,
        username: account.name,
        domain: account.domain,
      })),
    });
  } catch (err) {
    console.error('GET /api/admin/accounts:', err.message);
    res.status(502).json({ error: 'Unable to list mailboxes.' });
  }
});

app.get('/api/admin/account', requireAdmin, async (req, res) => {
  const email = String(req.query.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'A valid mailbox email is required.' });
  }

  try {
    const stalwartAccount = await stalwart.findAccountByEmail(email);
    const recoveryEmail = invitations.findRecoveryEmailByMailbox(email);

    res.json({
      email,
      stalwart: stalwartAccount
        ? { id: stalwartAccount.id, username: stalwartAccount.name, domain: stalwartAccount.domain }
        : null,
      recoveryEmail: recoveryEmail || null,
    });
  } catch (err) {
    console.error('GET /api/admin/account:', err.message);
    res.status(502).json({ error: 'Unable to look up account.' });
  }
});

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

  if (!['directory', 'stalwart', 'both', 'all'].includes(target)) {
    return res.status(400).json({
      error: 'Cleanup target must be directory, stalwart, both, or all.',
    });
  }

  try {
    const result = {};
    if (target === 'stalwart' || target === 'both' || target === 'all') {
      result.stalwart = await stalwart.deleteAccountByEmail(email);
    }
    // Always drop register's recovery mapping + reset tokens for the address, so a
    // later re-registration can't be taken over via the old owner's recovery email.
    result.mappingsPurged = invitations.purgeMailbox(email);
    passwordReset.revokeTokensForMailbox(email);
    res.json({ success: true, result });
  } catch (err) {
    console.error('POST /api/admin/cleanup-account:', err.message);
    res.status(502).json({ error: err.message });
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
