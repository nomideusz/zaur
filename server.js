require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');
const rateLimit = require('express-rate-limit');

const stalwart = require('./lib/stalwart');
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

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(
  session({
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
    webmailUrl: process.env.WEBMAIL_URL || 'https://bulwark.zaur.app',
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
  const { username, domainId, password, confirmPassword, captchaAnswer } = req.body;

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

    const available = await stalwart.checkUsernameAcrossDomains(usernameValidation.username);
    const selected = available.find((r) => r.domainId === domainId);
    if (!selected?.available) {
      return res.status(409).json({ error: 'This email address is no longer available.' });
    }

    const { email } = await stalwart.createAccount(
      usernameValidation.username,
      domainId,
      password,
    );

    delete req.session.captchaAnswer;

    res.json({
      success: true,
      email,
      webmailUrl: process.env.WEBMAIL_URL || 'https://bulwark.zaur.app',
      mailHost: process.env.MAIL_HOST || 'mail.zaur.app',
    });
  } catch (err) {
    console.error('POST /api/register:', err.message);
    const captcha = generateCaptcha();
    req.session.captchaAnswer = captcha.answer;
    res.status(400).json({ error: err.message, captcha: captcha.question });
  }
});

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/register', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
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
