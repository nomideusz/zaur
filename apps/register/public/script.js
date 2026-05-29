const USERNAME_REGEX = /^[a-z0-9][a-z0-9._-]{1,28}[a-z0-9]$/;

const usernameInput = document.getElementById('username-input');
const validationHint = document.getElementById('validation-hint');
const resultsContainer = document.getElementById('results-container');
const registerPanel = document.getElementById('register-panel');
const registerForm = document.getElementById('register-form');
const selectedDomainId = document.getElementById('selected-domain-id');
const selectedEmailLabel = document.getElementById('selected-email-label');
const formError = document.getElementById('form-error');
const captchaQuestion = document.getElementById('captcha-question');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirm-password');
const strengthFill = document.getElementById('strength-fill');
const strengthLabel = document.getElementById('strength-label');
const submitBtn = document.getElementById('submit-btn');

const invitationGate = document.getElementById('invitation-gate');
const invitationGateMessage = document.getElementById('invitation-gate-message');
const registerContent = document.getElementById('register-content');
const invitationBanner = document.getElementById('invitation-banner');
const inviteTokenInput = document.getElementById('invite-token');
const inviteEmailInput = document.getElementById('invite-email');

let requiresInvitation = false;
let invitationReady = false;
let inviteToken = '';
let inviteEmail = '';
let debounceTimer = null;
let currentUsername = '';
let selectedResult = null;
let checkAbortController = null;
let cachedDomains = [];
let availabilityMap = new Map();

const STRENGTH_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a'];

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
  const labels = ['Weak', 'Fair', 'Good', 'Strong', 'Very strong'];
  return { score: Math.min(score, 4), label: labels[Math.min(score, 4)] };
}

function updateStrengthBar() {
  const { score, label } = getPasswordStrength(passwordInput.value);
  const pct = (score / 4) * 100;
  strengthFill.style.width = `${pct}%`;
  strengthFill.style.background = STRENGTH_COLORS[score];
  strengthLabel.textContent = passwordInput.value ? label : '';
}

function showFormError(message) {
  formError.textContent = message;
  formError.classList.add('error');
  formError.style.display = 'block';
}

function hideFormError() {
  formError.style.display = 'none';
  formError.textContent = '';
}

function validateLocalUsername(value) {
  const normalized = value.toLowerCase().trim();
  if (!normalized) {
    return { valid: false, hint: '', username: '' };
  }
  if (normalized.length < 3) {
    return { valid: false, hint: '', username: normalized };
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

function renderStatus(domainId, status) {
  if (status === 'checking') {
    return '<span class="result-status checking flex items-center"><span class="spinner dib"></span></span>';
  }
  if (status === 'available') {
    return '<span class="result-status available green fw6 f6">Available</span><button type="button" class="btn-register bg-blue white f7 pv1 ph3 br2 fw6 bn pointer ml3 hover-bg-dark-blue">Register</button>';
  }
  if (status === 'taken') {
    return '<span class="result-status taken mid-gray f6">Taken</span>';
  }
  return '<span class="result-status pending">&nbsp;</span>';
}

function renderExtensionList() {
  if (!cachedDomains.length) {
    resultsContainer.innerHTML = '<div class="results-empty pv4 tc mid-gray">No domains available.</div>';
    return;
  }

  resultsContainer.innerHTML = `
    <div class="results-header f7 fw6 ttu tracked gray mb2 pl1">Available domains</div>
    <div class="results-list bg-white ba b--light-gray br3 shadow-1 overflow-hidden">${cachedDomains
      .map(
        (d) => `
      <div class="result-row extension-row flex items-center justify-between pv3 ph4 bb b--light-gray">
        <span class="result-domain f5 near-black">
          <span class="result-tld gray">@${escapeHtml(d.name)}</span>
        </span>
      </div>`,
      )
      .join('')}</div>`;
}

function renderSearchResults(query, statuses) {
  if (!cachedDomains.length) {
    resultsContainer.innerHTML = '<div class="results-empty pv4 tc mid-gray">No domains available.</div>';
    return;
  }

  const safeQuery = escapeHtml(query);

  resultsContainer.innerHTML = `<div class="results-list bg-white ba b--light-gray br3 shadow-1 overflow-hidden">${cachedDomains
    .map((d) => {
      const status = statuses.get(d.id) || 'pending';
      const isTaken = status === 'taken';
      const isAvailable = status === 'available';
      const isSelected = selectedResult?.domainId === d.id;

      return `
        <div class="result-row flex items-center justify-between pv3 ph4 bb b--light-gray pointer ${isAvailable ? 'available' : ''} ${isTaken ? 'taken o-60' : ''} ${isSelected ? 'selected' : ''}"
             data-domain-id="${d.id}"
             data-domain="${escapeHtml(d.name)}"
             data-available="${isAvailable}">
          <span class="result-domain f5 near-black ${isTaken ? 'taken-text' : ''}">
            <span class="result-name fw6">${safeQuery}</span><span class="result-tld gray">@${escapeHtml(d.name)}</span>
          </span>
          <span class="result-action flex items-center g2">${renderStatus(d.id, status)}</span>
        </div>`;
    })
    .join('')}</div>`;

  document.querySelectorAll('.result-row.available').forEach((row) => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.btn-register') || e.target === row) {
        selectDomain(row);
      }
    });
    row.querySelector('.btn-register')?.addEventListener('click', (e) => {
      e.stopPropagation();
      selectDomain(row);
    });
  });
}

function selectDomain(row) {
  document.querySelectorAll('.result-row').forEach((r) => r.classList.remove('selected'));
  row.classList.add('selected');

  selectedResult = {
    domainId: row.dataset.domainId,
    domain: row.dataset.domain,
  };

  selectedDomainId.value = selectedResult.domainId;
  selectedEmailLabel.textContent = `${currentUsername}@${selectedResult.domain}`;
  registerPanel.classList.add('visible');
  hideFormError();
  loadCaptcha();
  registerPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function updateView() {
  const { valid, hint, username } = validateLocalUsername(usernameInput.value);
  validationHint.textContent = hint;

  if (!username) {
    registerPanel.classList.remove('visible');
    selectedResult = null;
    availabilityMap.clear();
    renderExtensionList();
    return;
  }

  currentUsername = username;

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
    registerPanel.classList.remove('visible');
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
        captchaAnswer: document.getElementById('captcha-answer').value,
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
    window.location.href = `/success?email=${encodeURIComponent(data.email)}`;
  } catch {
    showFormError('Network error. Please try again.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create account';
  }
});

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
      registerContent.style.display = '';
      invitationGate.style.display = 'none';
      return;
    }

    if (!inviteToken || !inviteEmail) {
      registerContent.style.display = 'none';
      invitationGate.style.display = 'block';
      return;
    }

    const verifyRes = await fetch(
      `/api/invitation?${new URLSearchParams({ token: inviteToken, email: inviteEmail }).toString()}`,
    );
    const verifyData = await verifyRes.json();

    if (!verifyRes.ok || !verifyData.valid) {
      registerContent.style.display = 'none';
      invitationGate.style.display = 'block';
      invitationGateMessage.textContent =
        verifyData.error || 'This invitation link is invalid or has expired.';
      return;
    }

    invitationReady = true;
    inviteTokenInput.value = inviteToken;
    inviteEmailInput.value = inviteEmail;
    invitationBanner.style.display = 'block';
    invitationBanner.textContent = `Invited via ${inviteEmail}. Choose your new ZAUR address below.`;
    registerContent.style.display = '';
    invitationGate.style.display = 'none';
  } catch {
    registerContent.style.display = 'none';
    invitationGate.style.display = 'block';
    invitationGateMessage.textContent = 'Unable to verify invitation. Try again later.';
  }
}

async function init() {
  await initInvitation();
  if (!invitationReady) {
    resultsContainer.innerHTML = '';
    return;
  }

  resultsContainer.innerHTML = '<div class="results-empty">Loading domains…</div>';

  try {
    const [configRes, domainsRes] = await Promise.all([
      fetch('/api/config'),
      fetch('/api/domains'),
    ]);
    const config = await configRes.json();
    const { domains } = await domainsRes.json();
    cachedDomains = domains;

    const webmailLink = document.getElementById('webmail-link');
    const footerWebmail = document.getElementById('footer-webmail-link');
    if (webmailLink) webmailLink.href = config.webmailUrl;
    if (footerWebmail) footerWebmail.href = config.webmailUrl;

    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q) {
      usernameInput.value = q;
      updateView();
    } else {
      renderExtensionList();
    }
  } catch {
    resultsContainer.innerHTML = '<div class="results-empty">Unable to load domains.</div>';
  }
}

init();
