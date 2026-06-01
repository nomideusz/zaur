(function () {
  const FALLBACK_LOGIN = 'https://webmail.zaur.app/login';
  const THEME_KEY = 'zaur-theme';

  function loginUrl(cfg) {
    return cfg?.webmailLoginUrl || FALLBACK_LOGIN;
  }

  function applyWebmailLinks(cfg) {
    const url = loginUrl(cfg);
    document.querySelectorAll('[data-webmail-link]').forEach((el) => {
      el.href = url;
    });
  }

  function readThemeMode() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
    return 'system';
  }

  function resolveTheme(mode) {
    if (mode === 'dark') return 'dark';
    if (mode === 'light') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(resolved) {
    document.documentElement.classList.toggle('dark', resolved === 'dark');
    document.documentElement.classList.toggle('light', resolved === 'light');
  }

  function initTheme() {
    const mode = readThemeMode();
    const resolved = resolveTheme(mode);
    applyTheme(resolved);

    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
      toggle.textContent = `Toggle ${resolved === 'dark' ? 'light' : 'dark'} mode`;
      toggle.addEventListener('click', () => {
        const next = resolveTheme(readThemeMode()) === 'dark' ? 'light' : 'dark';
        localStorage.setItem(THEME_KEY, next);
        applyTheme(next);
        toggle.textContent = `Toggle ${next === 'dark' ? 'light' : 'dark'} mode`;
      });
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', () => {
      if (readThemeMode() !== 'system') return;
      applyTheme(resolveTheme('system'));
      if (toggle) {
        const resolvedNow = resolveTheme('system');
        toggle.textContent = `Toggle ${resolvedNow === 'dark' ? 'light' : 'dark'} mode`;
      }
    });
  }

  function getConfig() {
    if (window.ZAUR_SITE) return window.ZAUR_SITE;
    return fetch('/api/config')
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null);
  }

  async function init() {
    initTheme();
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
