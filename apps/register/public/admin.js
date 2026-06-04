document.addEventListener('DOMContentLoaded', () => {
  const loginContainer = document.getElementById('login-container');
  const dashboardContainer = document.getElementById('dashboard-container');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const logoutBtn = document.getElementById('logout-btn');

  const statTotal = document.getElementById('stat-total');
  const statUnused = document.getElementById('stat-unused');
  const statUsed = document.getElementById('stat-used');
  const statRevoked = document.getElementById('stat-revoked');

  const generateForm = document.getElementById('generate-form');
  const generateError = document.getElementById('generate-error');
  const generateSuccess = document.getElementById('generate-success');

  const tableFilter = document.getElementById('table-filter');
  const invitesTableBody = document.getElementById('invites-table-body');
  const runAuditBtn = document.getElementById('run-audit-btn');
  const auditError = document.getElementById('audit-error');
  const auditSuccess = document.getElementById('audit-success');
  const auditSummary = document.getElementById('audit-summary');
  const auditResults = document.getElementById('audit-results');

  let invitesList = [];

  function showDashboard() {
    loginContainer.classList.add('z-hidden');
    dashboardContainer.classList.remove('z-hidden');
    logoutBtn.classList.remove('z-hidden');
    loadInvitations();
    updateInviteEmailHint();
  }

  async function updateInviteEmailHint() {
    const hint = document.getElementById('invite-email-hint');
    if (!hint) return;
    try {
      const res = await fetch('/api/admin/status');
      const data = await res.json();
      hint.textContent = data.invitationEmailConfigured
        ? 'Enter an email address and we’ll email a registration link.'
        : 'Enter an email address to create a registration link (copy and send manually — SMTP not configured).';
    } catch {
      hint.textContent = 'Enter an email address to create a registration link.';
    }
  }

  async function checkAuthStatus() {
    try {
      const res = await fetch('/api/admin/status');
      const data = await res.json();

      if (!data.enabled) {
        showError('Admin panel is disabled. Please configure ADMIN_PASSWORD in environment variables.', loginError);
        document.getElementById('login-submit').disabled = true;
        return;
      }

      if (data.authenticated) {
        showDashboard();
      } else {
        showLogin();
      }
    } catch {
      showError('Failed to verify authentication status.', loginError);
    }
  }

  function showLogin() {
    loginContainer.classList.remove('z-hidden');
    dashboardContainer.classList.add('z-hidden');
    logoutBtn.classList.add('z-hidden');
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert(loginError);

    const password = document.getElementById('admin-password').value;

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (res.ok) {
        showDashboard();
        loginForm.reset();
      } else {
        showError(data.error || 'Authentication failed.', loginError);
      }
    } catch {
      showError('Network error. Please try again.', loginError);
    }
  });

  logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      showLogin();
    } catch {
      alert('Failed to log out.');
    }
  });

  async function loadInvitations() {
    try {
      const res = await fetch('/api/admin/invitations');
      if (!res.ok) {
        if (res.status === 401) {
          showLogin();
          return;
        }
        throw new Error('Failed to load invitations.');
      }
      const data = await res.json();
      invitesList = data.invitations || [];
      renderStats();
      renderTable(invitesList);
    } catch (err) {
      console.error(err);
      invitesTableBody.innerHTML =
        '<tr><td colspan="5" class="z-text-center z-text-muted" style="padding: 2rem;">Error loading invitations.</td></tr>';
    }
  }

  function renderStats() {
    const total = invitesList.length;
    const pending = invitesList.filter((item) => item.status === 'sent' || item.status === 'opened').length;
    const registered = invitesList.filter((item) => item.status === 'registered').length;
    const inactive = invitesList.filter((item) => ['expired', 'revoked'].includes(item.status)).length;

    statTotal.textContent = total;
    statUnused.textContent = pending;
    statUsed.textContent = registered;
    statRevoked.textContent = inactive;
  }

  function renderTable(list) {
    if (list.length === 0) {
      invitesTableBody.innerHTML =
        '<tr><td colspan="5" class="z-text-center z-text-muted" style="padding: 2rem;">No invitations found.</td></tr>';
      return;
    }

    invitesTableBody.innerHTML = '';
    const sortedList = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    sortedList.forEach((invite) => {
      const tr = document.createElement('tr');

      const tdEmail = document.createElement('td');
      tdEmail.className = 'z-td-code';
      tdEmail.innerHTML = `
        <span class="z-code-text">${escapeHtml(invite.recoveryEmail)}</span>
        <button class="z-btn-copy" title="Copy magic link" data-link="${escapeHtml(buildMagicLink(invite))}">
          <svg class="z-icon-copy" viewBox="0 0 24 24" fill="currentColor"><path d="M7 6V3C7 2.44772 7.44772 2 8 2H20C20.5523 2 21 2.44772 21 3V17C21 17.5523 20.5523 18 20 18H17V21C17 21.5523 16.5523 22 16 22H4C3.44772 22 3 21.5523 3 21V7C3 6.44772 3.44772 6 4 6H7ZM9 6H15V8H9V6ZM17 6V16H19V4H9V6H17ZM5 8V20H15V8H5Z"/></svg>
        </button>
      `;

      const tdStatus = document.createElement('td');
      const statusClass = {
        sent: 'z-badge--success',
        opened: 'z-badge--pending',
        registered: 'z-badge--warning',
        expired: 'z-badge--danger',
        revoked: 'z-badge--danger',
      }[invite.status] || 'z-badge--success';
      tdStatus.innerHTML = `<span class="z-badge ${statusClass}">${escapeHtml(invite.status)}</span>`;

      const tdCreated = document.createElement('td');
      tdCreated.innerHTML = `
        <div>${formatDate(invite.createdAt)}</div>
        <div class="z-used-meta">Expires ${formatDate(invite.expiresAt)}</div>
      `;

      const tdMailbox = document.createElement('td');
      if (invite.mailboxEmail) {
        tdMailbox.innerHTML = `
          <div>${escapeHtml(invite.mailboxEmail)}</div>
          <div class="z-used-meta">${formatDate(invite.consumedAt)}</div>
        `;
      } else {
        tdMailbox.textContent = '—';
        tdMailbox.className = 'z-text-muted';
      }

      const tdActions = document.createElement('td');
      if (invite.status === 'sent') {
        const revokeBtn = document.createElement('button');
        revokeBtn.className = 'z-btn-danger z-btn-sm';
        revokeBtn.textContent = 'Revoke';
        revokeBtn.addEventListener('click', () => revokeInvitation(invite.logtoTokenId));
        tdActions.appendChild(revokeBtn);
      } else {
        tdActions.textContent = '—';
        tdActions.className = 'z-text-muted';
      }

      tr.appendChild(tdEmail);
      tr.appendChild(tdStatus);
      tr.appendChild(tdCreated);
      tr.appendChild(tdMailbox);
      tr.appendChild(tdActions);
      invitesTableBody.appendChild(tr);
    });

    document.querySelectorAll('.z-btn-copy').forEach((btn) => {
      btn.addEventListener('click', () => {
        const link = btn.getAttribute('data-link');
        navigator.clipboard.writeText(link).then(() => {
          btn.classList.add('is-copied');
          setTimeout(() => btn.classList.remove('is-copied'), 1500);
        });
      });
    });
  }

  function buildMagicLink(invite) {
    const params = new URLSearchParams({ token: invite.token, email: invite.recoveryEmail });
    return `${window.location.origin}/?${params.toString()}`;
  }

  tableFilter.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    if (!term) {
      renderTable(invitesList);
      return;
    }

    const filtered = invitesList.filter((invite) => {
      const recoveryMatch = invite.recoveryEmail?.toLowerCase().includes(term);
      const mailboxMatch = invite.mailboxEmail && invite.mailboxEmail.toLowerCase().includes(term);
      return recoveryMatch || mailboxMatch;
    });

    renderTable(filtered);
  });

  runAuditBtn.addEventListener('click', () => runAudit());

  async function runAudit() {
    hideAlert(auditError);
    hideAlert(auditSuccess);
    auditSummary.innerHTML = '';
    auditResults.innerHTML = '';
    runAuditBtn.disabled = true;

    try {
      const res = await fetch('/api/admin/audit');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Audit failed.');

      auditSummary.innerHTML = `
        <div class="z-stat-card"><span class="z-type-label">Stalwart</span><strong class="z-stat-card__value">${data.counts.stalwartAccounts}</strong></div>
        <div class="z-stat-card"><span class="z-type-label">Logto</span><strong class="z-stat-card__value">${data.counts.logtoUsers}</strong></div>
        <div class="z-stat-card"><span class="z-type-label">Logto only</span><strong class="z-stat-card__value">${data.counts.logtoOnly}</strong></div>
        <div class="z-stat-card"><span class="z-type-label">Stalwart only</span><strong class="z-stat-card__value">${data.counts.stalwartOnly}</strong></div>
      `;

      auditResults.appendChild(renderAuditGroup('Logto only', data.logtoOnly, 'logto'));
      auditResults.appendChild(renderAuditGroup('Stalwart only', data.stalwartOnly, 'stalwart'));

      auditSuccess.textContent =
        data.counts.logtoOnly || data.counts.stalwartOnly
          ? 'Audit completed. Review mismatches below before cleanup.'
          : 'Audit completed. No provisioning mismatches found.';
      auditSuccess.classList.add('is-visible');
    } catch (err) {
      showError(err.message || 'Audit failed.', auditError);
    } finally {
      runAuditBtn.disabled = false;
    }
  }

  function renderAuditGroup(title, rows, cleanupTarget) {
    const section = document.createElement('section');
    section.innerHTML = `<h4 class="z-type-title" style="font-size: 1rem; margin: 0.75rem 0 0.5rem;">${escapeHtml(title)}</h4>`;

    if (!rows.length) {
      const empty = document.createElement('p');
      empty.className = 'z-audit-empty';
      empty.textContent = 'No mismatches.';
      section.appendChild(empty);
      return section;
    }

    const list = document.createElement('div');
    list.className = 'z-domain-list z-audit-list';
    rows.forEach((row) => {
      const email = row.email || row.username;
      const item = document.createElement('div');
      item.className = 'z-audit-row';
      item.innerHTML = `
        <span>${escapeHtml(email)}</span>
        <button type="button" class="z-btn-danger z-btn-sm">Delete from ${cleanupTarget}</button>
      `;
      item.querySelector('button').addEventListener('click', () => cleanupAccount(email, cleanupTarget));
      list.appendChild(item);
    });
    section.appendChild(list);
    return section;
  }

  async function cleanupAccount(email, target) {
    if (!confirm(`Delete ${email} from ${target}? This cannot be undone.`)) return;

    try {
      const res = await fetch('/api/admin/cleanup-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, target }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Cleanup failed.');
      await runAudit();
    } catch (err) {
      showError(err.message || 'Cleanup failed.', auditError);
    }
  }

  generateForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert(generateError);
    hideAlert(generateSuccess);

    const email = document.getElementById('invite-email').value.trim();
    const expiresInHours = parseInt(document.getElementById('invite-expires').value, 10);
    const submitBtn = document.getElementById('generate-submit');
    submitBtn.disabled = true;

    try {
      const res = await fetch('/api/admin/invitations/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, expiresInHours }),
      });

      const data = await res.json();
      if (res.ok) {
        if (data.emailSent) {
          generateSuccess.innerHTML = `Invitation email sent to <strong>${escapeHtml(data.invitation.recoveryEmail)}</strong>.`;
        } else if (data.emailError) {
          generateSuccess.innerHTML = `Invitation created for <strong>${escapeHtml(data.invitation.recoveryEmail)}</strong>, but email failed (${escapeHtml(data.emailError)}). Copy and send manually:<br><code>${escapeHtml(data.invitation.magicLink)}</code>`;
        } else {
          generateSuccess.innerHTML = `Link created for <strong>${escapeHtml(data.invitation.recoveryEmail)}</strong>. Copy and send manually:<br><code>${escapeHtml(data.invitation.magicLink)}</code>`;
        }
        generateSuccess.classList.add('is-visible');
        generateForm.reset();
        document.getElementById('invite-expires').value = '72';
        loadInvitations();
      } else {
        showError(data.error || 'Failed to create invitation.', generateError);
      }
    } catch {
      showError('Network error creating invitation.', generateError);
    } finally {
      submitBtn.disabled = false;
    }
  });

  async function revokeInvitation(logtoTokenId) {
    if (!confirm('Revoke this invitation link?')) {
      return;
    }

    try {
      const res = await fetch('/api/admin/invitations/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logtoTokenId }),
      });

      const data = await res.json();
      if (res.ok) {
        loadInvitations();
      } else {
        alert(data.error || 'Failed to revoke invitation.');
      }
    } catch {
      alert('Network error revoking invitation.');
    }
  }

  function showError(msg, element) {
    element.textContent = msg;
    element.classList.add('is-visible');
  }

  function hideAlert(element) {
    element.classList.remove('is-visible');
    element.textContent = '';
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatDate(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }

  checkAuthStatus();
});
