async function init() {
  const params = new URLSearchParams(window.location.search);
  const email = params.get('email') || sessionStorage.getItem('registeredEmail') || '—';

  document.getElementById('success-email').textContent = email;
  document.getElementById('settings-username').textContent = email;

  try {
    const cfg =
      window.ZAUR_SITE ||
      (await fetch('/api/config').then((res) => (res.ok ? res.json() : null)));
    if (!cfg) throw new Error('config unavailable');

    const webmailUrl = cfg.webmailUrl.replace(/\/$/, '');
    const mailHost = cfg.mailHost;

    document.getElementById('webmail-url').href = webmailUrl;
    document.getElementById('webmail-url').textContent = webmailUrl;
    document.getElementById('imap-host').textContent = mailHost;
    document.getElementById('smtp-host').textContent = mailHost;

    const loginParams = new URLSearchParams({ email, welcome: '1' });
    const loginUrl = `${webmailUrl}/login/start?${loginParams.toString()}`;
    document.getElementById('webmail-btn').href = loginUrl;

    document.getElementById('redirect-status').textContent = 'Taking you to sign in…';
    window.setTimeout(() => {
      window.location.href = loginUrl;
    }, 1200);
  } catch (err) {
    console.error('Failed to load register config:', err);
    document.getElementById('redirect-status').textContent =
      'Open mail below to sign in with your new address and password.';
    const fallback = window.ZaurSite?.loginUrl(window.ZAUR_SITE) || 'https://webmail.zaur.app/login';
    document.getElementById('webmail-btn').href = fallback;
  }
}

init();
