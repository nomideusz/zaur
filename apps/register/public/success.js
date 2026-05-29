async function init() {
  const params = new URLSearchParams(window.location.search);
  const email = params.get('email') || sessionStorage.getItem('registeredEmail') || '—';

  document.getElementById('success-email').textContent = email;
  document.getElementById('settings-username').textContent = email;

  try {
    const res = await fetch('/api/config');
    const config = await res.json();
    const webmailUrl = config.webmailUrl;
    const mailHost = config.mailHost;

    document.getElementById('webmail-url').href = webmailUrl;
    document.getElementById('webmail-url').textContent = webmailUrl;
    document.getElementById('header-webmail-link').href = webmailUrl;
    document.getElementById('imap-host').textContent = mailHost;
    document.getElementById('smtp-host').textContent = mailHost;

    const loginParams = new URLSearchParams({ email, welcome: '1', auto: '1' });
    const loginUrl = `${webmailUrl}/login?${loginParams.toString()}`;
    document.getElementById('webmail-btn').href = loginUrl;

    document.getElementById('redirect-status').textContent = 'Taking you to sign in…';
    window.setTimeout(() => {
      window.location.href = loginUrl;
    }, 1200);
  } catch (err) {
    console.error('Failed to load register config:', err);
    document.getElementById('redirect-status').textContent =
      'Open mail below to sign in with your new address and password.';
  }
}

init();
