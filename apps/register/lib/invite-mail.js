const nodemailer = require('nodemailer');

let transporter = null;

function isConfigured() {
  return Boolean(process.env.INVITE_SMTP_HOST?.trim() && process.env.INVITE_SMTP_FROM?.trim());
}

function getTransporter() {
  if (!isConfigured()) {
    throw new Error('Invitation email is not configured (INVITE_SMTP_HOST, INVITE_SMTP_FROM).');
  }

  if (!transporter) {
    const port = Number.parseInt(process.env.INVITE_SMTP_PORT || '587', 10);
    const secure = process.env.INVITE_SMTP_SECURE === 'true' || port === 465;
    transporter = nodemailer.createTransport({
      host: process.env.INVITE_SMTP_HOST.trim(),
      port,
      secure,
      auth:
        process.env.INVITE_SMTP_USER && process.env.INVITE_SMTP_PASSWORD
          ? {
              user: process.env.INVITE_SMTP_USER.trim(),
              pass: process.env.INVITE_SMTP_PASSWORD,
            }
          : undefined,
    });
  }

  return transporter;
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

  await getTransporter().sendMail({
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
  sendInvitationEmail,
};
