async function init() {
  const params = new URLSearchParams(window.location.search);
  const email = params.get('email') || sessionStorage.getItem('registeredEmail') || '—';

  document.getElementById('success-email').textContent = email;
  document.getElementById('settings-username').textContent = email;

  const passkeySection = document.getElementById('passkey-section');
  const passkeyBtn = document.getElementById('passkey-btn');
  const skipBtn = document.getElementById('skip-btn');
  const webmailBtn = document.getElementById('webmail-btn');
  const statusEl = document.getElementById('redirect-status');

  let passkeySetup = null;
  try {
    const stored = sessionStorage.getItem('passkeySetup');
    if (stored) {
      passkeySetup = JSON.parse(stored);
    }
  } catch {
    passkeySetup = null;
  }

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
    const loginUrl = `${webmailUrl}/login?${loginParams.toString()}`;
    webmailBtn.href = loginUrl;
    skipBtn.href = loginUrl;

    const canSetupPasskey =
      cfg.passkeySetupEnabled &&
      passkeySetup?.token &&
      passkeySetup.email?.toLowerCase() === email.toLowerCase();

    if (canSetupPasskey && passkeySection) {
      passkeySection.classList.remove('z-hidden');
      const setupParams = new URLSearchParams({
        email,
        token: passkeySetup.token,
      });
			passkeyBtn.href = `${webmailUrl}/setup-passkey?${setupParams.toString()}`;
      statusEl.textContent = 'Optional: set up a passkey — no need to re-enter your email.';
      sessionStorage.removeItem('passkeySetup');
    } else {
      statusEl.textContent = 'Open mail below to sign in with your new address and password.';
    }
  } catch (err) {
    console.error('Failed to load register config:', err);
    statusEl.textContent = 'Open mail below to sign in with your new address and password.';
    const fallback = window.ZaurSite?.loginUrl(window.ZAUR_SITE) || 'https://webmail.zaur.app/login';
    webmailBtn.href = fallback;
    skipBtn.href = fallback;
  }
}

init();
