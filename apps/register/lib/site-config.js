function normalizeUrl(url) {
  return String(url || '').replace(/\/$/, '');
}

function getSiteConfig() {
  const webmailUrl = normalizeUrl(process.env.WEBMAIL_URL || 'https://webmail.zaur.app');
  return {
    webmailUrl,
    webmailLoginUrl: `${webmailUrl}/login`,
    mailHost: process.env.MAIL_HOST || 'mail.zaur.app',
    registerUrl: normalizeUrl(
      process.env.REGISTER_PUBLIC_URL || 'https://register.zaur.app',
    ),
  };
}

module.exports = { getSiteConfig, normalizeUrl };
