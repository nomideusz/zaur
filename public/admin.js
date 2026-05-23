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
      invitesTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">Error loading invite codes.</td></tr>`;
    }
  }

  function renderStats() {
    const total = invitesList.length;
    const unused = invitesList.filter(i => !i.used && !i.revoked).length;
    const used = invitesList.filter(i => i.used).length;
    const revoked = invitesList.filter(i => i.revoked).length;

    statTotal.textContent = total;
    statUnused.textContent = unused;
    statUsed.textContent = used;
    statRevoked.textContent = revoked;
  }

  function renderTable(list) {
    if (list.length === 0) {
      invitesTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">No invite codes found.</td></tr>`;
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
          <svg class="icon-copy" viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
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
      } else {
        tdUsed.textContent = '—';
        tdUsed.style.color = 'var(--text-muted)';
      }

      // Actions Column
      const tdActions = document.createElement('td');
      if (!invite.used && !invite.revoked) {
        const revokeBtn = document.createElement('button');
        revokeBtn.className = 'btn btn-danger btn-sm';
        revokeBtn.textContent = 'Revoke';
        revokeBtn.addEventListener('click', () => revokeInvite(invite.code));
        tdActions.appendChild(revokeBtn);
      } else {
        tdActions.textContent = '—';
        tdActions.style.color = 'var(--text-muted)';
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
