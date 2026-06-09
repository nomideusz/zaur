const USERNAME_REGEX = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/;

const usernameInput = document.getElementById('username-input');
const validationHint = document.getElementById('validation-hint');
const resultsContainer = document.getElementById('results-container');
const registerPanel = document.getElementById('register-panel');
const registerForm = document.getElementById('register-form');
const selectedDomainId = document.getElementById('selected-domain-id');
const selectedEmailLabel = document.getElementById('selected-email-label');
const formError = document.getElementById('form-error');
const captchaQuestion = document.getElementById('captcha-question');
const passwordInput = document.getElementById('new-password');
const confirmPasswordInput = document.getElementById('confirm-password');
const strengthFill = document.getElementById('strength-fill');
const strengthLabel = document.getElementById('strength-label');
const submitBtn = document.getElementById('submit-btn');
const loginEmailInput = document.getElementById('login-email');

const invitationGate = document.getElementById('invitation-gate');
const invitationGateMessage = document.getElementById('invitation-gate-message');
const registerContent = document.getElementById('register-content');
const invitationBanner = document.getElementById('invitation-banner');
const inviteTokenInput = document.getElementById('invite-token');
const inviteEmailInput = document.getElementById('invite-email');
const captchaSection = document.getElementById('captcha-section');
const passwordHint = document.getElementById('password-hint');

let requiresInvitation = false;
let invitationReady = false;
let hasMagicLinkInvitation = false;
let inviteToken = '';
let inviteEmail = '';
let debounceTimer = null;
let currentUsername = '';
let selectedResult = null;
let checkAbortController = null;
let cachedDomains = [];
let availabilityMap = new Map();

const STRENGTH_LABELS = ['Weak', 'Fair', 'Good', 'Strong', 'Very strong'];

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getPasswordStrength(password) {
  if (!password) return { score: 0, label: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  const labels = STRENGTH_LABELS;
  return { score: Math.min(score, 4), label: labels[Math.min(score, 4)] };
}

function updateStrengthBar() {
  const { score, label } = getPasswordStrength(passwordInput.value);
  strengthFill.dataset.score = passwordInput.value ? String(score) : '0';
  strengthLabel.textContent = passwordInput.value ? label : '';
}

function showFormError(message) {
  formError.textContent = message;
  formError.classList.add('is-visible');
}

function hideFormError() {
  formError.classList.remove('is-visible');
  formError.textContent = '';
}

function validateLocalUsername(value) {
  const normalized = value.toLowerCase().trim();
  if (!normalized) {
    return { valid: false, hint: '', username: '' };
  }
  if (normalized.length > 30) {
    return { valid: false, hint: 'Maximum 30 characters.', username: normalized };
  }
  if (!USERNAME_REGEX.test(normalized)) {
    return {
      valid: false,
      hint: 'Letters, digits, dots, hyphens, underscores. Start and end with a letter or digit.',
      username: normalized,
    };
  }
  return { valid: true, username: normalized };
}

function renderStatus(status, isSelected) {
  if (status === 'checking') {
    return '<span class="z-result-status"><span class="z-spinner" aria-hidden="true"></span></span>';
  }
  if (status === 'available') {
    return `<span class="z-result-status available">${isSelected ? 'Selected' : 'Available'}</span>`;
  }
  if (status === 'taken') {
    return '<span class="z-result-status taken">Taken</span>';
  }
  return '';
}

function renderExtensionList() {
  if (!cachedDomains.length) {
    resultsContainer.innerHTML = '<div class="z-results-empty">No domains available.</div>';
    return;
  }

  resultsContainer.innerHTML = `
    <p class="z-type-label z-domain-pick-label">Domains</p>
    <ul class="z-domain-teaser__list">${cachedDomains
      .map((d) => `<li class="z-domain-teaser__item">@${escapeHtml(d.name)}</li>`)
      .join('')}</ul>
    <p class="z-domain-teaser__hint">Type a username to check availability.</p>`;
}

function renderSearchResults(query, statuses) {
  if (!cachedDomains.length) {
    resultsContainer.innerHTML = '<div class="z-results-empty">No domains available.</div>';
    return;
  }

  const safeQuery = escapeHtml(query);

  resultsContainer.innerHTML = `
    <p class="z-type-label z-domain-pick-label">Pick your address</p>
    <div class="z-domain-pick-grid">${cachedDomains
      .map((d) => {
        const status = statuses.get(d.id) || 'pending';
        const isTaken = status === 'taken';
        const isAvailable = status === 'available';
        const isSelected = selectedResult?.domainId === d.id;
        const tag = isAvailable ? 'button' : 'div';

        return `
        <${tag} type="${isAvailable ? 'button' : undefined}" class="z-domain-option ${isAvailable ? 'available' : ''} ${isTaken ? 'taken' : ''} ${isSelected ? 'selected' : ''}"
             data-domain-id="${d.id}"
             data-domain="${escapeHtml(d.name)}"
             data-available="${isAvailable}">
          <span class="z-domain-option__addr"><span class="z-result-name">${safeQuery}</span><span class="z-result-tld">@${escapeHtml(d.name)}</span></span>
          <span class="z-domain-option__status">${renderStatus(status, isSelected)}</span>
        </${tag}>`;
      })
      .join('')}</div>`;

  document.querySelectorAll('.z-domain-option.available').forEach((option) => {
    option.addEventListener('click', () => selectDomain(option));
  });
}

function applyInvitationUi() {
  if (hasMagicLinkInvitation) {
    if (captchaSection) captchaSection.classList.add('z-hidden');
    if (passwordHint) passwordHint.classList.remove('z-hidden');
    const captchaInput = document.getElementById('captcha-answer');
    if (captchaInput) captchaInput.required = false;
  }
}

function syncSelectedEmail() {
  if (!selectedResult || !currentUsername) return;
  const email = `${currentUsername}@${selectedResult.domain}`;
  selectedEmailLabel.textContent = email;
  if (loginEmailInput) loginEmailInput.value = email;
}

function configureFormForPasswordManagers() {
  const loginUrl = window.ZaurSite?.loginUrl(window.ZAUR_SITE) || 'https://webmail.zaur.app/login';
  registerForm.action = loginUrl;
  registerForm.method = 'post';
}

function selectDomain(row) {
  document.querySelectorAll('.z-domain-option').forEach((r) => r.classList.remove('selected'));
  row.classList.add('selected');
  document.getElementById('register-panel-hint')?.classList.add('z-hidden');

  selectedResult = {
    domainId: row.dataset.domainId,
    domain: row.dataset.domain,
  };

  selectedDomainId.value = selectedResult.domainId;
  syncSelectedEmail();
  registerPanel.classList.add('is-visible');
  hideFormError();
  window.ZaurLabelInput?.init(registerPanel);
  window.ZaurLabelInput?.syncAll(registerPanel);
  if (!hasMagicLinkInvitation) {
    loadCaptcha();
  }
  applyInvitationUi();
  if (currentUsername) {
    const statuses = new Map(
      cachedDomains.map((d) => [d.id, availabilityMap.get(d.id) || 'pending']),
    );
    renderSearchResults(currentUsername, statuses);
  }
  registerPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  passwordInput.focus();
}

function updateView() {
  const { valid, hint, username } = validateLocalUsername(usernameInput.value);
  validationHint.textContent = hint;

  if (!username) {
    registerPanel.classList.remove('is-visible');
    selectedResult = null;
    availabilityMap.clear();
    document.getElementById('register-panel-hint')?.classList.add('z-hidden');
    renderExtensionList();
    return;
  }

  currentUsername = username;
  if (selectedResult) syncSelectedEmail();

  const statuses = new Map();
  for (const d of cachedDomains) {
    if (valid) {
      statuses.set(d.id, availabilityMap.get(d.id) || 'checking');
    } else {
      statuses.set(d.id, 'pending');
    }
  }

  renderSearchResults(username, statuses);

  const panelHint = document.getElementById('register-panel-hint');
  if (valid && !selectedResult) {
    panelHint?.classList.remove('z-hidden');
  } else {
    panelHint?.classList.add('z-hidden');
  }

  if (!valid) {
    registerPanel.classList.remove('is-visible');
    selectedResult = null;
    return;
  }

  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => checkAvailability(username), 250);
}

async function checkAvailability(username) {
  if (checkAbortController) {
    checkAbortController.abort();
  }
  checkAbortController = new AbortController();

  availabilityMap = new Map(cachedDomains.map((d) => [d.id, 'checking']));
  renderSearchResults(username, availabilityMap);

  try {
    const res = await fetch('/api/check-username', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
      signal: checkAbortController.signal,
    });

    const data = await res.json();

    if (!res.ok) {
      validationHint.textContent = data.error || 'Check failed.';
      availabilityMap.clear();
      renderSearchResults(username, new Map(cachedDomains.map((d) => [d.id, 'pending'])));
      return;
    }

    currentUsername = data.username;
    availabilityMap = new Map(
      data.results.map((r) => [r.domainId, r.available ? 'available' : 'taken']),
    );
    renderSearchResults(currentUsername, availabilityMap);
  } catch (err) {
    if (err.name !== 'AbortError') {
      validationHint.textContent = 'Unable to check availability.';
    }
  }
}

async function loadCaptcha() {
  try {
    const res = await fetch('/api/captcha');
    const data = await res.json();
    captchaQuestion.textContent = data.question;
  } catch {
    captchaQuestion.textContent = 'Unable to load captcha';
  }
}

usernameInput.addEventListener('input', updateView);

passwordInput.addEventListener('input', updateStrengthBar);

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideFormError();

  if (!selectedResult) {
    showFormError('Select an available address.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating account…';

  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: currentUsername,
        domainId: selectedResult.domainId,
        inviteToken: inviteTokenInput.value,
        inviteEmail: inviteEmailInput.value,
        password: passwordInput.value,
        confirmPassword: confirmPasswordInput.value,
        captchaAnswer: hasMagicLinkInvitation ? undefined : document.getElementById('captcha-answer').value,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      showFormError(data.error || 'Registration failed.');
      if (data.captcha) {
        captchaQuestion.textContent = data.captcha;
      } else {
        loadCaptcha();
      }
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create account';
      return;
    }

    sessionStorage.setItem('registeredEmail', data.email);
    if (data.recoveryEmail) {
      sessionStorage.setItem('registeredRecoveryEmail', data.recoveryEmail);
    } else {
      sessionStorage.removeItem('registeredRecoveryEmail');
    }
    if (data.passkeySetup?.token) {
      sessionStorage.setItem(
        'passkeySetup',
        JSON.stringify({ email: data.email, token: data.passkeySetup.token }),
      );
    } else {
      sessionStorage.removeItem('passkeySetup');
    }
    window.location.href = `/success?email=${encodeURIComponent(data.email)}`;
  } catch {
    showFormError('Network error. Please try again.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create account';
  }
});

async function loadDomainTeaser() {
  const list = document.getElementById('teaser-domains');
  const sample = document.getElementById('teaser-sample');
  if (!list) return;

  try {
    const res = await fetch('/api/domains');
    const { domains } = await res.json();
    if (!domains?.length) {
      list.innerHTML = '<li class="z-domain-teaser__item z-text-subtle">No domains listed</li>';
      return;
    }

    list.innerHTML = domains
      .map((d) => `<li class="z-domain-teaser__item">@${escapeHtml(d.name)}</li>`)
      .join('');

    if (sample && domains[0]) {
      sample.hidden = false;
      sample.innerHTML = `<span class="z-domain-teaser__name">yourname</span><span class="z-domain-teaser__at">@${escapeHtml(domains[0].name)}</span>`;
    }
  } catch {
    list.innerHTML = '<li class="z-domain-teaser__item z-text-subtle">Unavailable</li>';
  }
}

function showInvitationGate(message) {
  registerContent.classList.add('z-hidden');
  invitationGate.classList.remove('z-hidden');
  if (message) invitationGateMessage.textContent = message;
  void loadDomainTeaser();
}

function showRegisterFlow() {
  invitationGate.classList.add('z-hidden');
  registerContent.classList.remove('z-hidden');
}

async function initInvitation() {
  const params = new URLSearchParams(window.location.search);
  inviteToken = params.get('token')?.trim() || '';
  inviteEmail = params.get('email')?.trim() || '';

  try {
    const configRes = await fetch('/api/config');
    const config = await configRes.json();
    requiresInvitation = config.requiresInvitation === true;

    if (!requiresInvitation) {
      invitationReady = true;
      showRegisterFlow();
      return;
    }

    if (!inviteToken || !inviteEmail) {
      showInvitationGate();
      return;
    }

    const verifyRes = await fetch(
      `/api/invitation?${new URLSearchParams({ token: inviteToken, email: inviteEmail }).toString()}`,
    );
    const verifyData = await verifyRes.json();

    if (!verifyRes.ok || !verifyData.valid) {
      showInvitationGate(
        verifyData.error || 'This invitation link is invalid or has expired.',
      );
      return;
    }

    invitationReady = true;
    hasMagicLinkInvitation = true;
    inviteTokenInput.value = inviteToken;
    inviteEmailInput.value = inviteEmail;
    invitationBanner.classList.remove('z-hidden');
    invitationBanner.innerHTML = `<span class="z-callout__title">Invitation verified</span><p class="z-text-muted z-callout__body">Registering as ${escapeHtml(inviteEmail)}. Pick your address below.</p>`;
    showRegisterFlow();
    applyInvitationUi();
  } catch {
    showInvitationGate('Unable to verify invitation. Try again later.');
  }
}

async function init() {
  configureFormForPasswordManagers();
  await initInvitation();
  if (!invitationReady) {
    resultsContainer.innerHTML = '';
    return;
  }

  resultsContainer.innerHTML = '<div class="z-results-empty">Loading domains…</div>';

  try {
    const domainsRes = await fetch('/api/domains');
    const { domains } = await domainsRes.json();
    cachedDomains = domains;

    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q) {
      usernameInput.value = q;
      updateView();
      window.ZaurLabelInput?.syncAll();
    } else {
      renderExtensionList();
    }
  } catch {
    resultsContainer.innerHTML = '<div class="z-results-empty">Unable to load domains.</div>';
  }
}

init();
