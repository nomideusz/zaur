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
  const generateCount = document.getElementById('generate-count');
  const generateError = document.getElementById('generate-error');
  const generateSuccess = document.getElementById('generate-success');

  const tableFilter = document.getElementById('table-filter');
  const invitesTableBody = document.getElementById('invites-table-body');
  const cleanupPendingBtn = document.getElementById('cleanup-pending-btn');
  const runAuditBtn = document.getElementById('run-audit-btn');
  const auditError = document.getElementById('audit-error');
  const auditSuccess = document.getElementById('audit-success');
  const auditSummary = document.getElementById('audit-summary');
  const auditResults = document.getElementById('audit-results');

  let invitesList = [];

  // Check current auth status
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
    } catch (err) {
      showError('Failed to verify authentication status.', loginError);
    }
  }

  function showLogin() {
    loginContainer.style.display = 'block';
    dashboardContainer.style.display = 'none';
    logoutBtn.style.display = 'none';
  }

  function showDashboard() {
    loginContainer.style.display = 'none';
    dashboardContainer.style.display = 'block';
    logoutBtn.style.display = 'inline-block';
    loadInvites();
  }

  // Handle Login
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.style.display = 'none';
    
    const password = document.getElementById('admin-password').value;

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      const data = await res.json();
      if (res.ok) {
        showDashboard();
        loginForm.reset();
      } else {
        showError(data.error || 'Authentication failed.', loginError);
      }
    } catch (err) {
      showError('Network error. Please try again.', loginError);
    }
  });

  // Handle Logout
  logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      showLogin();
    } catch (err) {
      alert('Failed to log out.');
    }
  });

  // Fetch and display invites
  async function loadInvites() {
    try {
      const res = await fetch('/api/admin/invites');
      if (!res.ok) {
        if (res.status === 401) {
          showLogin();
          return;
        }
        throw new Error('Failed to load invites.');
      }
      const data = await res.json();
      invitesList = data.invites || [];
      renderStats();
      renderTable(invitesList);
    } catch (err) {
      console.error(err);
      invitesTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--z-fg-muted); padding: 2rem;">Error loading invite codes.</td></tr>`;
    }
  }

  function renderStats() {
    const total = invitesList.length;
    const unused = invitesList.filter(i => !i.used && !i.revoked && !i.pending).length;
    const used = invitesList.filter(i => i.used).length;
    const revoked = invitesList.filter(i => i.revoked).length;

    statTotal.textContent = total;
    statUnused.textContent = unused;
    statUsed.textContent = used;
    statRevoked.textContent = revoked;
  }

  function renderTable(list) {
    if (list.length === 0) {
      invitesTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--z-fg-muted); padding: 2rem;">No invite codes found.</td></tr>`;
      return;
    }

    invitesTableBody.innerHTML = '';
    
    // Sort invites: newest first
    const sortedList = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    sortedList.forEach(invite => {
      const tr = document.createElement('tr');
      
      // Code Column with Copy Button
      const tdCode = document.createElement('td');
      tdCode.className = 'td-code';
      tdCode.innerHTML = `
        <span class="code-text">${escapeHtml(invite.code)}</span>
        <button class="btn-copy" title="Copy code" data-code="${escapeHtml(invite.code)}">
          <svg class="icon-copy" viewBox="0 0 24 24" fill="currentColor"><path d="M7 6V3C7 2.44772 7.44772 2 8 2H20C20.5523 2 21 2.44772 21 3V17C21 17.5523 20.5523 18 20 18H17V21C17 21.5523 16.5523 22 16 22H4C3.44772 22 3 21.5523 3 21V7C3 6.44772 3.44772 6 4 6H7ZM9 6H15V8H9V6ZM17 6V16H19V4H9V6H17ZM5 8V20H15V8H5Z"/></svg>
        </button>
      `;

      // Status Column
      const tdStatus = document.createElement('td');
      let statusClass = 'badge-unused';
      let statusText = 'Unused';
      
      if (invite.revoked) {
        statusClass = 'badge-revoked';
        statusText = 'Revoked';
      } else if (invite.used) {
        statusClass = 'badge-used';
        statusText = 'Used';
      } else if (invite.pending) {
        statusClass = 'badge-pending';
        statusText = 'Pending';
      }

      tdStatus.innerHTML = `<span class="badge ${statusClass}">${statusText}</span>`;

      // Created At Column
      const tdCreated = document.createElement('td');
      tdCreated.textContent = formatDate(invite.createdAt);

      // Used By Column
      const tdUsed = document.createElement('td');
      if (invite.used) {
        tdUsed.innerHTML = `
          <div class="used-email">${escapeHtml(invite.emailCreated)}</div>
          <div class="used-time">${formatDate(invite.usedAt)}</div>
        `;
      } else if (invite.pending) {
        tdUsed.innerHTML = `
          <div class="used-email">${escapeHtml(invite.emailPending)}</div>
          <div class="used-time">Reserved ${formatDate(invite.pendingAt)}</div>
        `;
      } else {
        tdUsed.textContent = '—';
        tdUsed.style.color = 'var(--z-fg-muted)';
      }

      // Actions Column
      const tdActions = document.createElement('td');
      if (!invite.used && !invite.revoked && !invite.pending) {
        const revokeBtn = document.createElement('button');
        revokeBtn.className = 'btn btn-danger btn-sm';
        revokeBtn.textContent = 'Revoke';
        revokeBtn.addEventListener('click', () => revokeInvite(invite.code));
        tdActions.appendChild(revokeBtn);
      } else {
        tdActions.textContent = '—';
        tdActions.style.color = 'var(--z-fg-muted)';
      }

      tr.appendChild(tdCode);
      tr.appendChild(tdStatus);
      tr.appendChild(tdCreated);
      tr.appendChild(tdUsed);
      tr.appendChild(tdActions);

      invitesTableBody.appendChild(tr);
    });

    // Attach copy event listeners
    document.querySelectorAll('.btn-copy').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const code = btn.getAttribute('data-code');
        navigator.clipboard.writeText(code).then(() => {
          // Visual feedback
          const svg = btn.querySelector('svg');
          btn.classList.add('copied');
          setTimeout(() => btn.classList.remove('copied'), 1500);
        }).catch(err => {
          console.error('Could not copy text: ', err);
        });
      });
    });
  }

  // Filter Table
  tableFilter.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    if (!term) {
      renderTable(invitesList);
      return;
    }

    const filtered = invitesList.filter(invite => {
      const codeMatch = invite.code.toLowerCase().includes(term);
      const emailMatch = invite.emailCreated && invite.emailCreated.toLowerCase().includes(term);
      return codeMatch || emailMatch;
    });

    renderTable(filtered);
  });

  cleanupPendingBtn.addEventListener('click', async () => {
    cleanupPendingBtn.disabled = true;
    try {
      const res = await fetch('/api/admin/invites/cleanup-pending', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Cleanup failed.');
      await loadInvites();
    } catch (err) {
      alert(err.message || 'Could not clean up stale pending invites.');
    } finally {
      cleanupPendingBtn.disabled = false;
    }
  });

  runAuditBtn.addEventListener('click', () => runAudit());

  async function runAudit() {
    auditError.style.display = 'none';
    auditSuccess.style.display = 'none';
    auditSummary.innerHTML = '';
    auditResults.innerHTML = '';
    runAuditBtn.disabled = true;

    try {
      const res = await fetch('/api/admin/audit');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Audit failed.');

      auditSummary.innerHTML = `
        <div class="audit-card bg-white ba b--light-gray br3 shadow-1 pa3 flex flex-column g1"><span class="f7 fw6 ttu tracked gray">Stalwart</span><strong class="f2 fw6 near-black lh-solid">${data.counts.stalwartAccounts}</strong></div>
        <div class="audit-card bg-white ba b--light-gray br3 shadow-1 pa3 flex flex-column g1"><span class="f7 fw6 ttu tracked gray">Directory</span><strong class="f2 fw6 near-black lh-solid">${data.counts.directoryUsers}</strong></div>
        <div class="audit-card bg-white ba b--light-gray br3 shadow-1 pa3 flex flex-column g1"><span class="f7 fw6 ttu tracked gray">Directory only</span><strong class="f2 fw6 near-black lh-solid">${data.counts.directoryOnly}</strong></div>
        <div class="audit-card bg-white ba b--light-gray br3 shadow-1 pa3 flex flex-column g1"><span class="f7 fw6 ttu tracked gray">Stalwart only</span><strong class="f2 fw6 near-black lh-solid">${data.counts.stalwartOnly}</strong></div>
      `;

      auditResults.appendChild(renderAuditGroup('Directory only', data.directoryOnly, 'directory'));
      auditResults.appendChild(renderAuditGroup('Stalwart only', data.stalwartOnly, 'stalwart'));

      auditSuccess.textContent = data.counts.directoryOnly || data.counts.stalwartOnly
        ? 'Audit completed. Review mismatches below before cleanup.'
        : 'Audit completed. No provisioning mismatches found.';
      auditSuccess.style.display = 'block';
    } catch (err) {
      showError(err.message || 'Audit failed.', auditError);
    } finally {
      runAuditBtn.disabled = false;
    }
  }

  function renderAuditGroup(title, rows, cleanupTarget) {
    const section = document.createElement('section');
    section.className = 'audit-group';
    section.innerHTML = `<h4 class="f5 fw6 near-black mt3 mb2">${escapeHtml(title)}</h4>`;

    if (!rows.length) {
      const empty = document.createElement('p');
      empty.className = 'audit-empty f6 mid-gray mt2 pl1';
      empty.textContent = 'No mismatches.';
      section.appendChild(empty);
      return section;
    }

    const list = document.createElement('div');
    list.className = 'audit-list bg-white ba b--light-gray br3 shadow-1 overflow-hidden';
    rows.forEach((row) => {
      const email = row.email || row.username;
      const item = document.createElement('div');
      item.className = 'audit-row flex items-center justify-between pv3 ph4 bb b--light-gray';
      item.innerHTML = `
        <span class="f6 near-black">${escapeHtml(email)}</span>
        <button type="button" class="btn btn-danger btn-sm bg-washed-red red hover-bg-red hover-white bn pointer pv1 ph2 br2 f7 fw5 ml3">Delete from ${cleanupTarget}</button>
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

  // Handle Generation
  generateForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    generateError.style.display = 'none';
    generateSuccess.style.display = 'none';

    const count = parseInt(generateCount.value, 10);
    const submitBtn = document.getElementById('generate-submit');
    submitBtn.disabled = true;

    try {
      const res = await fetch('/api/admin/invites/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count })
      });

      const data = await res.json();
      if (res.ok) {
        generateSuccess.innerHTML = `Successfully generated <strong>${data.codes.length}</strong> code(s). <br>Newest code: <code>${data.codes[0]}</code>`;
        generateSuccess.style.display = 'block';
        loadInvites();
      } else {
        showError(data.error || 'Failed to generate codes.', generateError);
      }
    } catch (err) {
      showError('Network error generating codes.', generateError);
    } finally {
      submitBtn.disabled = false;
    }
  });

  // Handle Revoke
  async function revokeInvite(code) {
    if (!confirm(`Are you sure you want to revoke invite code ${code}?`)) {
      return;
    }

    try {
      const res = await fetch('/api/admin/invites/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });

      const data = await res.json();
      if (res.ok) {
        loadInvites();
      } else {
        alert(data.error || 'Failed to revoke code.');
      }
    } catch (err) {
      alert('Network error revoking code.');
    }
  }

  // Helpers
  function showError(msg, element) {
    element.textContent = msg;
    element.style.display = 'block';
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
      hour12: false
    });
  }

  // Run initialization
  checkAuthStatus();
});
