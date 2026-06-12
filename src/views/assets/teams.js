let currentTeams = [];

async function loadTeams() {
  try {
    const res = await fetch('/api/teams');
    const data = await res.json();
    if (data.ok) {
      currentTeams = data.teams;
      renderTeamSelect();
      
      if (data.isAdmin && !document.getElementById('adminSidebarLink')) {
        const nav = document.querySelector('.sidebar-nav');
        if (nav) {
          const adminLink = document.createElement('a');
          adminLink.id = 'adminSidebarLink';
          adminLink.className = 'sidebar-link';
          adminLink.href = '/admin';
          adminLink.innerHTML = `<svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Admin Panel`;
          // If we are on admin page, mark active
          if (window.location.pathname === '/admin') {
            adminLink.classList.add('is-active');
          }
        
        const mobileNav = document.querySelector('.mobile-nav');
        if (mobileNav && !document.getElementById('adminMobileLink')) {
          const adminMobileLink = document.createElement('a');
          adminMobileLink.id = 'adminMobileLink';
          adminMobileLink.href = '/admin';
          adminMobileLink.textContent = 'Admin';
          if (window.location.pathname === '/admin') {
            adminMobileLink.classList.add('is-active');
          }
          mobileNav.appendChild(adminMobileLink);
        }
          nav.appendChild(adminLink);
        }
      }
    }
  } catch (err) {
    console.error('Failed to load teams', err);
  }
}

function getActiveTeamId() {
  let activeId = localStorage.getItem('activeTeamId');
  if (!activeId && currentTeams.length > 0) {
    activeId = currentTeams[0].id;
    localStorage.setItem('activeTeamId', activeId);
  }
  if (activeId && !currentTeams.find(t => t.id === activeId) && currentTeams.length > 0) {
    activeId = currentTeams[0].id;
    localStorage.setItem('activeTeamId', activeId);
  }
  return activeId;
}

function renderTeamSelect() {
  const wrappers = document.querySelectorAll('.team-switcher-wrapper');
  const activeId = getActiveTeamId();
  const activeTeam = currentTeams.find(t => t.id === activeId);
  const activeName = activeTeam ? activeTeam.name : 'Select Team';
  
  wrappers.forEach(wrapper => {
    // Inject Custom Dropdown
    wrapper.innerHTML = `
      <span class="team-switcher-label">TEAM</span>
      <div class="custom-dropdown" id="teamDropdownBtn">
        <div class="dropdown-trigger">
          <span class="dropdown-selected">${activeName}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </div>
        <div class="dropdown-menu" id="teamDropdownMenu">
          ${currentTeams.map(t => `
            <div class="dropdown-item ${t.id === activeId ? 'is-active' : ''}" data-id="${t.id}" data-locked="${t.isLocked}">
              ${t.name}
              ${t.isLocked ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left:6px; opacity: 0.6;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>` : ''}
              ${t.id === activeId ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left:auto; color:var(--primary);"><polyline points="20 6 9 17 4 12"></polyline></svg>` : ''}
            </div>
          `).join('')}
          <div class="dropdown-divider"></div>
          <div class="dropdown-item create-btn" id="showCreateModalBtn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Create New Team
          </div>
        </div>
      </div>
    `;

    // Dropdown Logic
    const trigger = wrapper.querySelector('.dropdown-trigger');
    const menu = wrapper.querySelector('.dropdown-menu');
    
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = menu.classList.contains('show');
      document.querySelectorAll('.dropdown-menu.show').forEach(m => m.classList.remove('show'));
      if (!isOpen) menu.classList.add('show');
    });

    // Select Team Logic
    const items = menu.querySelectorAll('.dropdown-item:not(.create-btn)');
    items.forEach(item => {
      item.addEventListener('click', async () => {
        const targetId = item.getAttribute('data-id');
        const isLocked = item.getAttribute('data-locked') === 'true';
        
        if (targetId === activeId) return;
        menu.classList.remove('show');

        if (isLocked) {
          const savedPwd = sessionStorage.getItem('team_pwd_' + targetId);
          if (!savedPwd) {
            const pwd = await promptTeamPassword();
            if (pwd === null) return;
            
            // Verify
            const res = await fetch('/api/teams/' + targetId, {
              headers: { 'X-Team-Password': pwd }
            });
            if (!res.ok) {
              alert('รหัสผ่านไม่ถูกต้อง (Incorrect password)');
              return;
            }
            sessionStorage.setItem('team_pwd_' + targetId, pwd);
          }
        }

        localStorage.setItem('activeTeamId', targetId);
        window.dispatchEvent(new Event('teamChanged'));
        renderTeamSelect(); // Re-render to update selected name
      });
    });

    // Create Team Logic
    const createBtn = menu.querySelector('#showCreateModalBtn');
    createBtn.addEventListener('click', () => {
      menu.classList.remove('show');
      showCreateTeamModal();
    });
  });
  
  // Close dropdown on outside click
  document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-menu.show').forEach(m => m.classList.remove('show'));
  });
  
  window.dispatchEvent(new Event('teamChanged'));
}

// Global Modal Injection
function injectModalHtml() {
  if (document.getElementById('createTeamModal')) return;
  const modalHtml = `
    <div class="modal-overlay" id="createTeamModal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Create New Team</h2>
          <button class="modal-close" id="closeModalBtn">&times;</button>
        </div>
        <div class="modal-body">
          <label>Team Name</label>
          <input type="text" id="newTeamNameInput" placeholder="e.g. Web Development" autocomplete="off" style="margin-bottom: 12px;">
          <label>Password <span style="font-size: 0.75rem; color: var(--muted); font-weight: normal;">(Optional)</span></label>
          <input type="password" id="newTeamPasswordInput" placeholder="Leave blank for no password" autocomplete="off">
        </div>
        <div class="modal-footer">
          <button class="ghost" id="cancelModalBtn">Cancel</button>
          <button class="btn-success" id="confirmModalBtn">Create Team</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // Auth Modal Html
  const authModalHtml = `
    <div class="modal-overlay" id="authTeamModal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Team is Locked</h2>
          <button class="modal-close" id="closeAuthModalBtn">&times;</button>
        </div>
        <div class="modal-body">
          <p style="font-size: 0.85rem; color: var(--muted); margin-bottom: 12px;">This team requires a password to perform actions.</p>
          <label>Password</label>
          <input type="password" id="authTeamPasswordInput" placeholder="Enter team password" autocomplete="off">
        </div>
        <div class="modal-footer">
          <button class="ghost" id="cancelAuthModalBtn">Cancel</button>
          <button class="btn-success" id="confirmAuthModalBtn">Unlock</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', authModalHtml);

  // Modal Listeners
  document.getElementById('closeModalBtn').onclick = hideCreateTeamModal;
  document.getElementById('cancelModalBtn').onclick = hideCreateTeamModal;
  document.getElementById('confirmModalBtn').onclick = submitNewTeam;
  
  document.getElementById('newTeamNameInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') submitNewTeam();
  });
}

// --- Team Auth Handlers ---
let authPromiseResolver = null;

function promptTeamPassword() {
  injectModalHtml();
  const modal = document.getElementById('authTeamModal');
  const input = document.getElementById('authTeamPasswordInput');
  input.value = '';
  modal.classList.add('show');
  input.focus();

  return new Promise((resolve) => {
    authPromiseResolver = resolve;

    document.getElementById('closeAuthModalBtn').onclick = () => { modal.classList.remove('show'); resolve(null); };
    document.getElementById('cancelAuthModalBtn').onclick = () => { modal.classList.remove('show'); resolve(null); };
    
    document.getElementById('confirmAuthModalBtn').onclick = () => {
      modal.classList.remove('show');
      resolve(input.value);
    };

    input.onkeypress = (e) => {
      if (e.key === 'Enter') {
        modal.classList.remove('show');
        resolve(input.value);
      }
    };
  });
}

window.teamFetch = async function(url, options = {}) {
  const activeId = getActiveTeamId();
  if (!options.headers) options.headers = {};
  
  const savedPwd = sessionStorage.getItem('team_pwd_' + activeId);
  if (savedPwd) {
    options.headers['X-Team-Password'] = savedPwd;
  }

  let res = await fetch(url, options);
  
  // If unauthorized due to password
  if (res.status === 401) {
    const data = await res.clone().json().catch(() => ({}));
    if (data.isLocked) {
      const pwd = await promptTeamPassword();
      if (pwd === null) {
        throw new Error('Canceled password entry');
      }
      sessionStorage.setItem('team_pwd_' + activeId, pwd);
      options.headers['X-Team-Password'] = pwd;
      res = await fetch(url, options);
    }
  }

  return res;
};

function showCreateTeamModal() {
  injectModalHtml();
  const modal = document.getElementById('createTeamModal');
  const input = document.getElementById('newTeamNameInput');
  const pwdInput = document.getElementById('newTeamPasswordInput');
  input.value = '';
  if (pwdInput) pwdInput.value = '';
  modal.classList.add('show');
  input.focus();
}

function hideCreateTeamModal() {
  const modal = document.getElementById('createTeamModal');
  if (modal) modal.classList.remove('show');
}

async function submitNewTeam() {
  const name = document.getElementById('newTeamNameInput').value.trim();
  const pwdInput = document.getElementById('newTeamPasswordInput');
  const password = pwdInput ? pwdInput.value.trim() : '';
  if (!name) return;

  const btn = document.getElementById('confirmModalBtn');
  btn.disabled = true;
  btn.textContent = 'Creating...';

  try {
    const res = await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password })
    });
    const data = await res.json();
    if (data.ok) {
      localStorage.setItem('activeTeamId', data.team.id);
      if (password) sessionStorage.setItem('team_pwd_' + data.team.id, password);
      window.location.href = '/setup'; 
    }
  } catch (err) {
    alert('Failed to create team');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create Team';
  }
}

document.addEventListener('DOMContentLoaded', loadTeams);
