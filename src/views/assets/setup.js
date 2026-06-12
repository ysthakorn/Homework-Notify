const envForm = document.getElementById('envForm');
const envFields = document.getElementById('envFields');
const envStatus = document.getElementById('envStatus');
const deleteTeamBtn = document.getElementById('deleteTeamBtn');

function setStatus(text, isError = false) {
  envStatus.textContent = text;
  envStatus.style.color = isError ? '#ef4444' : '#22c55e';
  setTimeout(() => { envStatus.textContent = ''; }, 3000);
}

let currentTeamData = null;

async function loadTeamConfig() {
  const teamId = localStorage.getItem('activeTeamId');
  if (!teamId) return;

  try {
    const fetcher = window.teamFetch || fetch;
    const res = await fetcher(`/api/teams/${teamId}`);
    if (!res.ok) {
      const data = await res.json().catch(()=>({}));
      throw new Error(data.error || 'Failed to load team config');
    }
    const data = await res.json();
    const team = data.team;
    
    if (team) {
      envFields.innerHTML = `
        <label>Team Name</label>
        <input name="name" type="text" value="${team.name || ''}" required>
        
        <label>LINE Access Token</label>
        <input name="lineAccessToken" type="text" value="${team.lineAccessToken || ''}">
        
        <label>LINE Group ID (to)</label>
        <input name="lineGroupId" type="text" value="${team.lineGroupId || ''}">
        
        <label>Google Sheet ID <span style="font-size: 0.75rem; color: var(--muted); font-weight: normal;">(e.g. 1a2b3c4d5e...)</span></label>
        <input name="googleSheetId" type="text" value="${team.googleSheetId || ''}">
        
        <label>API Key (For External Integrations) <span style="font-size: 0.75rem; color: var(--muted); font-weight: normal;">(Auto-generated)</span></label>
        <div style="display:flex; gap:8px; margin-bottom: 16px;">
          <input id="apiKeyInput" type="password" value="${team.apiKey || ''}" readonly style="flex:1; background: var(--bg); cursor: text;">
          <button type="button" class="ghost" onclick="toggleApiKey()" style="border: 1px solid var(--border);">Show</button>
          <button type="button" class="ghost" onclick="regenApiKey()" style="border: 1px solid var(--border); color: var(--primary);">Regenerate</button>
        </div>
      `;
      
      currentTeamData = team;
      
      const meRes = await fetch('/api/me');
      const meData = await meRes.json();
      const myEmail = meData.user ? meData.user.email : '';
      
      const listRes = await fetch('/api/teams');
      const listData = await listRes.json();
      
      if (team.owner === myEmail || listData.isAdmin) {
        document.getElementById('membersCard').style.display = 'block';
        renderMembers();
      } else {
        document.getElementById('membersCard').style.display = 'none';
      }
      
      // Determine if we can delete this team (check total teams count)
      if (listData.teams && listData.teams.length <= 1) {
        deleteTeamBtn.style.display = 'none';
      } else {
        deleteTeamBtn.style.display = 'inline-block';
      }
    }
  } catch (err) {
    if (err.message !== 'Canceled password entry') {
      envFields.innerHTML = `<div class="danger">โหลดข้อมูลไม่สำเร็จ: ${err.message}</div>`;
    }
  }
}

envForm.onsubmit = async (e) => {
  e.preventDefault();
  const teamId = localStorage.getItem('activeTeamId');
  if (!teamId) return;

  setStatus('กำลังบันทึก...', false);
  const formData = new FormData(envForm);
  const payload = Object.fromEntries(formData);
  
  try {
    const fetcher = window.teamFetch || fetch;
    const res = await fetcher(`/api/teams/${teamId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      if (payload.password) {
        sessionStorage.setItem('team_pwd_' + teamId, payload.password);
      }
      setStatus('บันทึกสำเร็จ!');
      // Update global team list
      window.dispatchEvent(new Event('teamChanged'));
    } else {
      setStatus(data.error || 'บันทึกไม่สำเร็จ', true);
    }
  } catch (err) {
    if (err.message !== 'Canceled password entry') {
      setStatus('เกิดข้อผิดพลาดในการเชื่อมต่อ', true);
    }
  }
};

deleteTeamBtn.onclick = async () => {
  const teamId = localStorage.getItem('activeTeamId');
  if (!teamId) return;
  
  if (!confirm('Are you sure you want to delete this team?')) return;
  
  try {
    const res = await fetch(`/api/teams/${teamId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error();
    localStorage.removeItem('activeTeamId');
    loadTeams(); // re-init and auto-select another team
  } catch (err) {
    alert('Failed to delete team.');
  }
};

function renderMembers() {
  const list = document.getElementById('membersList');
  if (!currentTeamData.members) currentTeamData.members = [];
  
  if (currentTeamData.members.length === 0) {
    list.innerHTML = '<div class="muted">No shared members yet.</div>';
    return;
  }
  
  list.innerHTML = currentTeamData.members.map((m, i) => `
    <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg); padding: 8px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border);">
      <span style="font-size: 0.9rem;">${m}</span>
      <button type="button" class="ghost" style="color: #ef4444; padding: 4px;" onclick="removeMember(${i})">Remove</button>
    </div>
  `).join('');
}

window.removeMember = async function(idx) {
  currentTeamData.members.splice(idx, 1);
  await saveMembers();
  renderMembers();
};

document.getElementById('addMemberBtn').onclick = async () => {
  const input = document.getElementById('newMemberEmail');
  const email = input.value.trim();
  if (!email) return;
  if (!currentTeamData.members) currentTeamData.members = [];
  if (currentTeamData.members.includes(email)) return;
  
  currentTeamData.members.push(email);
  input.value = '';
  await saveMembers();
  renderMembers();
};

async function saveMembers() {
  const teamId = currentTeamData.id;
  const fetcher = window.teamFetch || fetch;
  const status = document.getElementById('memberStatus');
  status.textContent = 'Saving...';
  status.style.color = 'var(--muted)';
  try {
    const res = await fetcher(`/api/teams/${teamId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ members: currentTeamData.members })
    });
    if (res.ok) {
      status.textContent = 'Members updated successfully.';
      status.style.color = '#22c55e';
      setTimeout(() => status.textContent = '', 2000);
      window.dispatchEvent(new Event('teamChanged'));
    } else {
      status.textContent = 'Failed to update members.';
      status.style.color = '#ef4444';
    }
  } catch (err) {
    status.textContent = 'Error connecting to server.';
    status.style.color = '#ef4444';
  }
}

window.toggleApiKey = function() {
  const input = document.getElementById('apiKeyInput');
  const btn = event.currentTarget;
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = 'Hide';
  } else {
    input.type = 'password';
    btn.textContent = 'Show';
  }
};

window.regenApiKey = async function() {
  if (!confirm('Are you sure you want to regenerate the API Key? Any external systems using the old key will lose access.')) return;
  const teamId = currentTeamData.id;
  const fetcher = window.teamFetch || fetch;
  try {
    const res = await fetcher(`/api/teams/${teamId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ regenerateApiKey: true })
    });
    const data = await res.json();
    if (data.ok) {
      document.getElementById('apiKeyInput').value = data.team.apiKey;
      setStatus('API Key regenerated successfully', false);
    }
  } catch (e) {
    setStatus('Failed to regenerate key', true);
  }
};

window.addEventListener('teamChanged', loadTeamConfig);
document.addEventListener('DOMContentLoaded', loadTeamConfig);
