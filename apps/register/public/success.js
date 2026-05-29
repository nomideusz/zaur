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
    document.getElementById('webmail-btn').href = `${webmailUrl}/login?next=${encodeURIComponent('/')}`;
    document.getElementById('header-webmail-link').href = webmailUrl;
    document.getElementById('imap-host').textContent = mailHost;
    document.getElementById('smtp-host').textContent = mailHost;
  } catch (err) {
    console.error('Failed to load register config:', err);
  }
}

init();
