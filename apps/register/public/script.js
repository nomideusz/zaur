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

const registerSplit = document.getElementById('register-split');
const invitationGate = document.getElementById('invitation-gate');
const invitationGateMessage = document.getElementById('invitation-gate-message');
const registerContent = document.getElementById('register-content');
const invitationBanner = document.getElementById('invitation-banner');
const inviteTokenInput = document.getElementById('invite-token');
const inviteEmailInput = document.getElementById('invite-email');
const captchaSection = document.getElementById('captcha-section');
const registerTagline = document.getElementById('register-tagline');

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
let mountedListUsername = '';
const DOMAIN_LIST_SCROLL_THRESHOLD = 8;

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

function sortedDomains() {
  return [...cachedDomains].sort((a, b) => a.name.localeCompare(b.name));
}

function syncDomainListScroll() {
  const list = resultsContainer.querySelector('.z-domain-pick-list');
  if (!list) return;
  list.classList.toggle(
    'z-domain-pick-list--scroll',
    cachedDomains.length > DOMAIN_LIST_SCROLL_THRESHOLD,
  );
}

function updateDomainPickLabel(statuses) {
  const label = resultsContainer.querySelector('.z-domain-pick-label');
  if (!label) return;
  const availableCount = cachedDomains.filter((d) => statuses.get(d.id) === 'available').length;
  label.textContent = availableCount
    ? `Addresses · ${availableCount} available`
    : 'Addresses';
}

function domainOptionMarkup(d, query, status, isSelected) {
  const isTaken = status === 'taken';
  const isAvailable = status === 'available';
  const safeQuery = escapeHtml(query);
  const tag = isAvailable ? 'button' : 'div';

  return `
    <${tag} type="${isAvailable ? 'button' : undefined}" role="${isAvailable ? 'option' : 'presentation'}" aria-selected="${isSelected ? 'true' : 'false'}" class="z-domain-option ${isAvailable ? 'available' : ''} ${isTaken ? 'taken' : ''} ${isSelected ? 'selected' : ''}"
         data-domain-id="${d.id}"
         data-domain="${escapeHtml(d.name)}"
         data-available="${isAvailable}">
      <span class="z-domain-option__addr"><span class="z-result-name">${safeQuery}</span><span class="z-result-tld">@${escapeHtml(d.name)}</span></span>
      <span class="z-domain-option__status">${renderStatus(status, isSelected)}</span>
    </${tag}>`;
}

function bindDomainOptions(root = resultsContainer) {
  root.querySelectorAll('.z-domain-option.available').forEach((option) => {
    if (option.dataset.bound === 'true') return;
    option.dataset.bound = 'true';
    option.addEventListener('click', () => selectDomain(option));
  });
}

function updateDomainOptionElement(option, query, status, isSelected) {
  const isTaken = status === 'taken';
  const isAvailable = status === 'available';
  const wasAvailable = option.classList.contains('available');
  const nameEl = option.querySelector('.z-result-name');
  const statusEl = option.querySelector('.z-domain-option__status');

  if (nameEl) nameEl.textContent = query;
  if (statusEl) statusEl.innerHTML = renderStatus(status, isSelected);

  option.classList.toggle('available', isAvailable);
  option.classList.toggle('taken', isTaken);
  option.classList.toggle('selected', isSelected);
  option.dataset.available = String(isAvailable);
  option.setAttribute('aria-selected', isSelected ? 'true' : 'false');

  if (isAvailable && !wasAvailable) {
    const replacement = document.createElement('button');
    replacement.type = 'button';
    replacement.className = option.className;
    replacement.dataset.domainId = option.dataset.domainId;
    replacement.dataset.domain = option.dataset.domain;
    replacement.dataset.available = 'true';
    replacement.setAttribute('role', 'option');
    replacement.setAttribute('aria-selected', isSelected ? 'true' : 'false');
    replacement.innerHTML = option.innerHTML;
    option.replaceWith(replacement);
    replacement.dataset.bound = 'true';
    replacement.addEventListener('click', () => selectDomain(replacement));
    return replacement;
  }

  if (!isAvailable && wasAvailable) {
    const replacement = document.createElement('div');
    replacement.className = option.className;
    replacement.dataset.domainId = option.dataset.domainId;
    replacement.dataset.domain = option.dataset.domain;
    replacement.dataset.available = 'false';
    replacement.setAttribute('role', 'presentation');
    replacement.setAttribute('aria-selected', 'false');
    replacement.innerHTML = option.innerHTML;
    option.replaceWith(replacement);
    return replacement;
  }

  return option;
}

function mountDomainList(query, statuses) {
  const domains = sortedDomains();
  resultsContainer.innerHTML = `
    <p class="z-type-label z-domain-pick-label"></p>
    <div class="z-domain-pick-list" role="listbox" aria-label="Available addresses">${domains
      .map((d) => {
        const status = statuses.get(d.id) || 'pending';
        const isSelected = selectedResult?.domainId === d.id;
        return domainOptionMarkup(d, query, status, isSelected);
      })
      .join('')}</div>`;
  mountedListUsername = query;
  updateDomainPickLabel(statuses);
  syncDomainListScroll();
  bindDomainOptions();
}

function patchDomainList(query, statuses) {
  const list = resultsContainer.querySelector('.z-domain-pick-list');
  if (!list) {
    mountDomainList(query, statuses);
    return;
  }

  updateDomainPickLabel(statuses);

  for (const domain of sortedDomains()) {
    const status = statuses.get(domain.id) || 'pending';
    const isSelected = selectedResult?.domainId === domain.id;
    let option = list.querySelector(`[data-domain-id="${domain.id}"]`);
    if (!option) continue;
    option = updateDomainOptionElement(option, query, status, isSelected);
  }
}

function renderExtensionList() {
  mountedListUsername = '';
  if (!cachedDomains.length) {
    resultsContainer.innerHTML = '<div class="z-results-empty">No domains available.</div>';
    return;
  }

  resultsContainer.innerHTML = `
    <p class="z-type-label z-domain-pick-label">Domains</p>
    <ul class="z-domain-teaser__list">${cachedDomains
      .map((d) => `<li class="z-domain-teaser__item">@${escapeHtml(d.name)}</li>`)
      .join('')}</ul>`;
}

function renderSearchResults(query, statuses) {
  if (!cachedDomains.length) {
    mountedListUsername = '';
    resultsContainer.innerHTML = '<div class="z-results-empty">No domains available.</div>';
    return;
  }

  if (!resultsContainer.querySelector('.z-domain-pick-list')) {
    mountDomainList(query, statuses);
    return;
  }

  mountedListUsername = query;
  patchDomainList(query, statuses);
}

function applyInvitationUi() {
  if (hasMagicLinkInvitation) {
    registerContent.classList.add('has-invitation');
    if (registerTagline) registerTagline.classList.add('z-hidden');
    if (captchaSection) captchaSection.classList.add('z-hidden');
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
    patchDomainList(currentUsername, statuses);
  }
  if (window.matchMedia('(max-width: 767px)').matches) {
    registerPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  passwordInput.focus();
}

function syncSplitState(hasUsername) {
  registerSplit?.classList.toggle('has-username', hasUsername);
}

function updateView() {
  const { valid, hint, username } = validateLocalUsername(usernameInput.value);
  validationHint.textContent = hint;

  if (!username) {
    registerPanel.classList.remove('is-visible');
    selectedResult = null;
    availabilityMap.clear();
    mountedListUsername = '';
    syncSplitState(false);
    renderExtensionList();
    return;
  }

  currentUsername = username;
  syncSplitState(valid);
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
    invitationBanner.innerHTML = `<span class="z-invite-status__badge">Invited</span><span class="z-invite-status__email">${escapeHtml(inviteEmail)}</span>`;
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
