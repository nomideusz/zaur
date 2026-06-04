const nodemailer = require('nodemailer');

let transporter = null;
let verifyPromise = null;

function isConfigured() {
  return Boolean(process.env.INVITE_SMTP_HOST?.trim() && process.env.INVITE_SMTP_FROM?.trim());
}

function isInternalRelayHost(host) {
  return host.includes('srv-captain--') || host.endsWith('.internal');
}

function getTlsServername(host) {
  const configured = process.env.INVITE_SMTP_TLS_SERVERNAME?.trim();
  if (configured) return configured;
  if (isInternalRelayHost(host)) return process.env.INVITE_SMTP_PUBLIC_HOST?.trim() || 'mail.zaur.app';
  return host;
}

function getSmtpOptions() {
  if (!isConfigured()) {
    throw new Error('Invitation email is not configured (INVITE_SMTP_HOST, INVITE_SMTP_FROM).');
  }

  const host = process.env.INVITE_SMTP_HOST.trim();
  const internalRelay =
    process.env.INVITE_SMTP_INTERNAL === 'true' ||
    (process.env.INVITE_SMTP_INTERNAL !== 'false' && isInternalRelayHost(host) && !process.env.INVITE_SMTP_USER);

  if (internalRelay) {
    const port = Number.parseInt(process.env.INVITE_SMTP_PORT || '25', 10);
    return {
      host,
      port,
      secure: false,
      ignoreTLS: true,
      requireTLS: false,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
      auth: undefined,
    };
  }

  const port = Number.parseInt(process.env.INVITE_SMTP_PORT || '465', 10);
  const secure =
    process.env.INVITE_SMTP_SECURE === 'true' ||
    process.env.INVITE_SMTP_SECURE === '1' ||
    port === 465;

  const tls = {
    servername: getTlsServername(host),
    minVersion: 'TLSv1.2',
  };

  if (process.env.INVITE_SMTP_TLS_REJECT_UNAUTHORIZED === 'false') {
    tls.rejectUnauthorized = false;
  }

  return {
    host,
    port,
    secure,
    requireTLS: !secure && port === 587,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
    auth:
      process.env.INVITE_SMTP_USER && process.env.INVITE_SMTP_PASSWORD
        ? {
            user: process.env.INVITE_SMTP_USER.trim(),
            pass: process.env.INVITE_SMTP_PASSWORD,
          }
        : undefined,
    tls,
  };
}

function formatSmtpError(err) {
  const parts = [err.message || 'SMTP send failed'];
  if (err.code) parts.push(`code=${err.code}`);
  if (err.responseCode) parts.push(`response=${err.responseCode}`);
  if (err.response) parts.push(String(err.response).trim());
  if (err.command) parts.push(`command=${err.command}`);
  return parts.join('; ');
}

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport(getSmtpOptions());
  }
  return transporter;
}

async function verifySmtp() {
  if (!isConfigured()) {
    throw new Error('Invitation email is not configured (INVITE_SMTP_HOST, INVITE_SMTP_FROM).');
  }

  if (!verifyPromise) {
    verifyPromise = getTransporter()
      .verify()
      .catch((err) => {
        verifyPromise = null;
        throw new Error(`SMTP connection failed (${getSmtpOptions().host}:${getSmtpOptions().port}): ${formatSmtpError(err)}`);
      });
  }

  return verifyPromise;
}

async function sendMail(message) {
  try {
    await verifySmtp();
    await getTransporter().sendMail(message);
    return true;
  } catch (err) {
    verifyPromise = null;
    throw new Error(formatSmtpError(err));
  }
}

async function sendInvitationEmail({ to, magicLink, expiresAt }) {
  const from = process.env.INVITE_SMTP_FROM.trim();
  const fromName = process.env.INVITE_SMTP_FROM_NAME?.trim() || 'ZAUR';
  const expiresText = expiresAt
    ? new Date(expiresAt).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'soon';

  const subject = process.env.INVITE_EMAIL_SUBJECT?.trim() || 'Your ZAUR registration invitation';
  const text = [
    'You have been invited to create a ZAUR email address.',
    '',
    'Open this link to choose your address and set a password:',
    magicLink,
    '',
    `This link expires ${expiresText}.`,
    '',
    'If you did not expect this email, you can ignore it.',
  ].join('\n');

  const html = `
    <p>You have been invited to create a ZAUR email address.</p>
    <p><a href="${magicLink}">Claim your address</a></p>
    <p>This link expires ${expiresText}.</p>
    <p style="color:#666;font-size:14px;">If you did not expect this email, you can ignore it.</p>
  `.trim();

  await sendMail({
    from: `"${fromName}" <${from}>`,
    to,
    subject,
    text,
    html,
  });

  return true;
}

async function sendPasswordResetEmail({ to, mailboxEmail, resetLink, expiresAt }) {
  const from = process.env.INVITE_SMTP_FROM.trim();
  const fromName = process.env.INVITE_SMTP_FROM_NAME?.trim() || 'ZAUR';
  const expiresText = expiresAt
    ? new Date(expiresAt).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'soon';

  const subject =
    process.env.PASSWORD_RESET_EMAIL_SUBJECT?.trim() || 'Reset your ZAUR password';
  const text = [
    `We received a request to reset the password for ${mailboxEmail}.`,
    '',
    'Open this link to choose a new password:',
    resetLink,
    '',
    `This link expires ${expiresText}.`,
    '',
    'If you did not request a password reset, you can ignore this email.',
  ].join('\n');

  const html = `
    <p>We received a request to reset the password for <strong>${mailboxEmail}</strong>.</p>
    <p><a href="${resetLink}">Choose a new password</a></p>
    <p>This link expires ${expiresText}.</p>
    <p style="color:#666;font-size:14px;">If you did not request a password reset, you can ignore this email.</p>
  `.trim();

  await sendMail({
    from: `"${fromName}" <${from}>`,
    to,
    subject,
    text,
    html,
  });

  return true;
}

module.exports = {
  isConfigured,
  verifySmtp,
  sendInvitationEmail,
  sendPasswordResetEmail,
};
