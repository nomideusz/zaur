(function () {
  const FALLBACK_LOGIN = 'https://webmail.zaur.app/login';

  function loginUrl(cfg) {
    return cfg?.webmailLoginUrl || FALLBACK_LOGIN;
  }

  function applyWebmailLinks(cfg) {
    const url = loginUrl(cfg);
    document.querySelectorAll('[data-webmail-link]').forEach((el) => {
      el.href = url;
    });
  }

  function getConfig() {
    if (window.ZAUR_SITE) return window.ZAUR_SITE;
    return fetch('/api/config')
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null);
  }

  async function init() {
    const cfg = window.ZAUR_SITE || (await getConfig());
    if (cfg) {
      window.ZAUR_SITE = cfg;
      applyWebmailLinks(cfg);
    } else {
      applyWebmailLinks(null);
    }
  }

  window.ZaurSite = {
    loginUrl,
    applyWebmailLinks,
    getConfig: () => window.ZAUR_SITE || null,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    void init();
  }
})();
