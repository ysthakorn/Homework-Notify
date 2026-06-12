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
        if (targetId === activeId) return;
        menu.classList.remove('show');

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
        </div>
        <div class="modal-footer">
          <button class="ghost" id="cancelModalBtn">Cancel</button>
          <button class="btn-success" id="confirmModalBtn">Create Team</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);



  // Modal Listeners
  document.getElementById('closeModalBtn').onclick = hideCreateTeamModal;
  document.getElementById('cancelModalBtn').onclick = hideCreateTeamModal;
  document.getElementById('confirmModalBtn').onclick = submitNewTeam;
  
  document.getElementById('newTeamNameInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') submitNewTeam();
  });
}

window.teamFetch = async function(url, options = {}) {
  return await fetch(url, options);
};

function showCreateTeamModal() {
  injectModalHtml();
  const modal = document.getElementById('createTeamModal');
  const input = document.getElementById('newTeamNameInput');
  input.value = '';
  modal.classList.add('show');
  input.focus();
}

function hideCreateTeamModal() {
  const modal = document.getElementById('createTeamModal');
  if (modal) modal.classList.remove('show');
}

async function submitNewTeam() {
  const name = document.getElementById('newTeamNameInput').value.trim();
  if (!name) return;

  const btn = document.getElementById('confirmModalBtn');
  btn.textContent = 'Creating...';
  btn.disabled = true;

  try {
    const res = await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    const data = await res.json();
    if (data.ok) {
      localStorage.setItem('activeTeamId', data.team.id);
      window.location.href = '/setup'; 
    }
  } catch (err) {
    console.error('Failed to create team', err);
    btn.textContent = 'Create Team';
    btn.disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', loadTeams);
