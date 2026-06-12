(function() {
  function getTheme() {
    let mode = localStorage.getItem('theme-mode');
    if (!mode || mode === 'system') {
      mode = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    return mode;
  }
  
  function getColor() {
    return localStorage.getItem('theme-color') || 'indigo';
  }

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', getTheme());
    document.documentElement.setAttribute('data-color', getColor());
  }

  // Initial apply to prevent FOUC
  applyTheme();

  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme-mode') || localStorage.getItem('theme-mode') === 'system') {
      document.documentElement.setAttribute('data-theme', e.matches ? 'light' : 'dark');
    }
  });

  window.setThemeMode = function(mode) {
    localStorage.setItem('theme-mode', mode);
    applyTheme();
    updateThemeUI();
  };

  window.setThemeColor = function(color) {
    localStorage.setItem('theme-color', color);
    applyTheme();
    updateThemeUI();
  };

  // UI Integration
  document.addEventListener('DOMContentLoaded', () => {
    // 1. Inject Theme Settings Modal
    const modalHtml = `
      <div class="modal-overlay" id="themeModal">
        <div class="modal-content" style="max-width: 320px;">
          <div class="modal-header">
            <h2>Appearance</h2>
            <button class="modal-close" id="closeThemeModalBtn">&times;</button>
          </div>
          <div class="modal-body">
            <div style="margin-bottom: 20px;">
              <label style="display:block; margin-bottom: 8px; font-weight: 600; font-size:0.85rem; color:var(--muted);">MODE</label>
              <div style="display:flex; gap:8px;">
                <button class="btn-theme-mode" data-mode="system">System</button>
                <button class="btn-theme-mode" data-mode="light">Light</button>
                <button class="btn-theme-mode" data-mode="dark">Dark</button>
              </div>
            </div>
            <div>
              <label style="display:block; margin-bottom: 8px; font-weight: 600; font-size:0.85rem; color:var(--muted);">COLOR</label>
              <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <button class="btn-theme-color" data-color="indigo" style="background:#6366f1;" title="Indigo"></button>
                <button class="btn-theme-color" data-color="blue" style="background:#3b82f6;" title="Blue"></button>
                <button class="btn-theme-color" data-color="emerald" style="background:#10b981;" title="Emerald"></button>
                <button class="btn-theme-color" data-color="amber" style="background:#f59e0b;" title="Amber"></button>
                <button class="btn-theme-color" data-color="rose" style="background:#f43f5e;" title="Rose"></button>
                <button class="btn-theme-color" data-color="violet" style="background:#8b5cf6;" title="Violet"></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // 2. Add Theme Toggle Button to Sidebar Footer & Mobile Nav
    const sidebarFooter = document.querySelector('.sidebar-footer');
    if (sidebarFooter) {
      sidebarFooter.innerHTML = `
        <div id="cfUserProfile" style="display: none; align-items: center; gap: 10px; background: var(--bg-card); padding: 8px; border-radius: var(--radius-sm); border: 1px solid var(--border); margin-bottom: 12px;">
          <div id="cfUserAvatar" style="width: 28px; height: 28px; border-radius: 50%; background: var(--primary); color: white; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; flex-shrink: 0; box-shadow: 0 2px 8px var(--primary-glow);"></div>
          <div style="flex: 1; min-width: 0;">
            <div id="cfUserName" style="font-size: 0.8rem; font-weight: 600; color: var(--ink); white-space: nowrap; text-overflow: ellipsis; overflow: hidden; font-family: 'LINE Seed Sans TH', sans-serif;"></div>
            <div id="cfUserEmail" style="font-size: 0.65rem; color: var(--muted); white-space: nowrap; text-overflow: ellipsis; overflow: hidden;"></div>
          </div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
          <span>v1.0.0</span>
          <button id="themeToggleBtn" style="background:transparent; border:none; color:var(--muted); cursor:pointer; padding:4px; display: flex;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42 1.42"/></svg>
          </button>
        </div>
      `;
      sidebarFooter.style.display = 'flex';
      sidebarFooter.style.flexDirection = 'column';
      sidebarFooter.style.alignItems = 'stretch';
      
      // Fetch User Identity
      fetch('/api/me').then(r => r.json()).then(data => {
        if (data.ok && data.user && data.user.email) {
          const profile = document.getElementById('cfUserProfile');
          const avatar = document.getElementById('cfUserAvatar');
          const nameEl = document.getElementById('cfUserName');
          const emailEl = document.getElementById('cfUserEmail');
          
          nameEl.textContent = data.user.name;
          emailEl.textContent = data.user.email;
          
          const nameParts = data.user.name.split(' ');
          let initials = data.user.name.substring(0, 2).toUpperCase();
          if (nameParts.length > 1) {
            initials = (nameParts[0][0] + nameParts[1][0]).toUpperCase();
          }
          avatar.textContent = initials;
          profile.style.display = 'flex';
        }
      }).catch(e => console.error("CF Access user fetch failed:", e));
    }

    const themeModal = document.getElementById('themeModal');
    const openBtn = document.getElementById('themeToggleBtn');
    if (openBtn) {
      openBtn.addEventListener('click', () => {
        themeModal.classList.add('show');
        updateThemeUI();
      });
    }

    document.getElementById('closeThemeModalBtn').addEventListener('click', () => {
      themeModal.classList.remove('show');
    });

    themeModal.addEventListener('click', (e) => {
      if (e.target === themeModal) themeModal.classList.remove('show');
    });

    document.querySelectorAll('.btn-theme-mode').forEach(btn => {
      btn.addEventListener('click', () => {
        window.setThemeMode(btn.getAttribute('data-mode'));
      });
    });

    document.querySelectorAll('.btn-theme-color').forEach(btn => {
      btn.addEventListener('click', () => {
        window.setThemeColor(btn.getAttribute('data-color'));
      });
    });

    window.updateThemeUI = function() {
      const currentMode = localStorage.getItem('theme-mode') || 'system';
      const currentColor = getColor();

      document.querySelectorAll('.btn-theme-mode').forEach(btn => {
        if (btn.getAttribute('data-mode') === currentMode) {
          btn.style.background = 'var(--primary)';
          btn.style.color = '#fff';
          btn.style.borderColor = 'var(--primary)';
        } else {
          btn.style.background = 'var(--bg)';
          btn.style.color = 'var(--ink)';
          btn.style.borderColor = 'var(--border)';
        }
      });

      document.querySelectorAll('.btn-theme-color').forEach(btn => {
        if (btn.getAttribute('data-color') === currentColor) {
          btn.style.transform = 'scale(1.2)';
          btn.style.boxShadow = '0 0 0 2px var(--bg-sidebar), 0 0 0 4px var(--primary)';
        } else {
          btn.style.transform = 'scale(1)';
          btn.style.boxShadow = 'none';
        }
      });
    };
  });
})();
