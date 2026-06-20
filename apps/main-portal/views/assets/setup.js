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

window.renderTokenInputs = function() {
  const container = document.getElementById('tokensContainer');
  const tokens = currentTeamData.lineAccessTokens || [];
  if (tokens.length === 0) tokens.push({token: '', remark: ''}); // At least one
  
  container.innerHTML = tokens.map((t, i) => `
    <div class="token-item" style="display:flex; gap:8px; align-items:center;">
      <input name="tokenValue" type="text" placeholder="LINE Access Token" value="${t.token || ''}" style="flex:2;">
      <input name="tokenRemark" type="text" placeholder="หมายเหตุ (เช่น ครู A)" value="${t.remark || ''}" style="flex:1;">
      <button type="button" class="ghost" onclick="removeTokenInput(this)" style="color:#ef4444; padding:4px;">ลบ</button>
    </div>
  `).join('');
};

window.addTokenInput = function() {
  const container = document.getElementById('tokensContainer');
  const div = document.createElement('div');
  div.className = 'token-item';
  div.style = 'display:flex; gap:8px; align-items:center; margin-top:4px;';
  div.innerHTML = `
      <input name="tokenValue" type="text" placeholder="LINE Access Token" value="" style="flex:2;">
      <input name="tokenRemark" type="text" placeholder="หมายเหตุ (เช่น ครู A)" value="" style="flex:1;">
      <button type="button" class="ghost" onclick="removeTokenInput(this)" style="color:#ef4444; padding:4px;">ลบ</button>
  `;
  container.appendChild(div);
};

window.removeTokenInput = function(btn) {
  btn.parentElement.remove();
  if (document.getElementById('tokensContainer').children.length === 0) {
    addTokenInput();
  }
};

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
        
        <label style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 4px;">
          <span>LINE Access Tokens <span style="font-size: 0.75rem; color: var(--muted); font-weight: normal;">(ส่งแบบลำดับจนกว่าจะสำเร็จ)</span></span>
          <button type="button" class="ghost" onclick="addTokenInput()" style="font-size: 0.75rem; padding: 4px 8px; border: 1px solid var(--border);">+ เพิ่ม Token</button>
        </label>
        <div id="tokensContainer" style="display:flex; flex-direction:column; gap:4px; margin-bottom:16px;"></div>
        
        <label>LINE Group ID (to)</label>
        <input name="lineGroupId" type="text" value="${team.lineGroupId || ''}">

        <label>API Key (For External Integrations) <span style="font-size: 0.75rem; color: var(--muted); font-weight: normal;">(Auto-generated)</span></label>
        <div style="display:flex; gap:8px; margin-bottom: 16px;">
          <input id="apiKeyInput" type="password" value="${team.apiKey || ''}" readonly style="flex:1; background: var(--bg); cursor: text;">
          <button type="button" class="ghost" onclick="toggleApiKey()" style="border: 1px solid var(--border);">Show</button>
          <button type="button" class="ghost" onclick="regenApiKey()" style="border: 1px solid var(--border); color: var(--primary);">Regenerate</button>
        </div>

        <hr style="border:0; border-top:1px solid var(--border); margin: 16px 0;">
        <div style="margin-bottom:12px; font-weight:600; font-size:0.95rem;">Google Form Integration</div>
        
        <label>Google Form URL</label>
        <input name="googleFormUrl" type="url" value="${team.googleFormUrl || ''}" placeholder="https://docs.google.com/forms/d/e/.../viewform">
        
        <label>Google Form Entry ID (สำหรับชื่องาน)</label>
        <input name="googleFormEntryId" type="text" value="${team.googleFormEntryId || ''}" placeholder="entry.123456789">

        <label>Google Form Entry ID (สำหรับวิชา)</label>
        <input name="googleFormSubjectEntryId" type="text" value="${team.googleFormSubjectEntryId || ''}" placeholder="entry.987654321">
        
        <label>Google Sheet CSV URL (จาก Published to web)</label>
        <input name="googleSheetCsvUrl" type="url" value="${team.googleSheetCsvUrl || ''}" placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv">

        <hr style="border:0; border-top:1px solid var(--border); margin: 16px 0;">
        <div style="margin-bottom:12px; font-weight:600; font-size:0.95rem; display: flex; align-items: center; justify-content: space-between;">
          <span>Code Red Reminder</span>
          <label style="display:flex; align-items:center; cursor:pointer;">
            <input type="checkbox" name="codeRedEnabled" ${team.codeRedEnabled !== false ? 'checked' : ''} style="width:auto; margin:0 8px 0 0;">
            <span style="font-weight:normal; font-size:0.85rem;">เปิดใช้งานแจ้งเตือนก่อนหมดเวลา 24 ชม.</span>
          </label>
        </div>
      `;
      
      currentTeamData = team;
      window.renderTokenInputs();
      
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

      // Always show students card
      document.getElementById('studentsCard').style.display = 'block';
      renderStudents();
      
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
  payload.codeRedEnabled = formData.get('codeRedEnabled') === 'on';
  
  // Gather dynamic tokens
  const tokenElements = document.querySelectorAll('.token-item');
  const lineAccessTokens = [];
  tokenElements.forEach(el => {
    const token = el.querySelector('[name="tokenValue"]').value.trim();
    const remark = el.querySelector('[name="tokenRemark"]').value.trim();
    if (token) lineAccessTokens.push({ token, remark });
  });
  payload.lineAccessTokens = lineAccessTokens;
  delete payload.tokenValue;
  delete payload.tokenRemark;
  delete payload.lineAccessToken; // Remove legacy if exists
  
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

// --- Members ---
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

// --- Students Roster ---
function renderStudents() {
  const list = document.getElementById('studentsList');
  if (!currentTeamData.students) currentTeamData.students = [];
  
  const count = currentTeamData.students.length;
  document.getElementById('studentCount').textContent = count > 0 ? `(${count} คน)` : '';

  if (count === 0) {
    list.innerHTML = '<div class="muted">ยังไม่มีรายชื่อนักเรียน — เพิ่มรายชื่อเพื่อใช้ติดตามการส่งงาน</div>';
    return;
  }
  
  list.innerHTML = currentTeamData.students.map((s, i) => `
    <div class="student-item">
      <div class="student-number">${i + 1}</div>
      <div style="flex: 1;">
        <div class="student-name" style="font-size: 0.88rem;">${s.name}</div>
        <div class="muted" style="font-size: 0.75rem;">${s.email || 'ไม่มีอีเมล'}</div>
      </div>
      <button type="button" class="ghost student-remove-btn" onclick="removeStudent(${i})">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  `).join('');
}

window.removeStudent = async function(idx) {
  currentTeamData.students.splice(idx, 1);
  await saveStudents();
  renderStudents();
};

document.getElementById('addStudentBtn').onclick = async () => {
  const nameInput = document.getElementById('newStudentName');
  const emailInput = document.getElementById('newStudentEmail');
  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  
  if (!name) return;
  if (!currentTeamData.students) currentTeamData.students = [];
  
  if (currentTeamData.students.some(s => s.name === name)) {
    document.getElementById('studentStatus').textContent = 'ชื่อนี้มีอยู่แล้ว';
    document.getElementById('studentStatus').style.color = '#ef4444';
    setTimeout(() => document.getElementById('studentStatus').textContent = '', 2000);
    return;
  }
  
  currentTeamData.students.push({ name, email });
  nameInput.value = '';
  emailInput.value = '';
  await saveStudents();
  renderStudents();
  nameInput.focus();
};

// Support adding students with Enter key
document.getElementById('newStudentName').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    document.getElementById('addStudentBtn').click();
  }
});

// Bulk add students
window.bulkAddStudents = async function() {
  const textarea = document.getElementById('bulkStudentInput');
  const text = textarea.value.trim();
  if (!text) return;

  if (!currentTeamData.students) currentTeamData.students = [];
  
  const newStudents = text.split('\n')
    .map(line => {
      const parts = line.split(',');
      return {
        name: parts[0].trim(),
        email: parts.length > 1 ? parts[1].trim() : ''
      };
    })
    .filter(s => s.name && !currentTeamData.students.some(existing => existing.name === s.name));
  
  if (newStudents.length === 0) {
    document.getElementById('studentStatus').textContent = 'ไม่มีชื่อใหม่ที่จะเพิ่ม หรือข้อมูลไม่ถูกต้อง';
    document.getElementById('studentStatus').style.color = '#ef4444';
    setTimeout(() => document.getElementById('studentStatus').textContent = '', 2000);
    return;
  }

  currentTeamData.students.push(...newStudents);
  textarea.value = '';
  await saveStudents();
  renderStudents();
  // Collapse bulk input
  document.getElementById('bulkInputArea').style.display = 'none';
};

window.toggleBulkInput = function() {
  const area = document.getElementById('bulkInputArea');
  area.style.display = area.style.display === 'none' ? 'block' : 'none';
  if (area.style.display !== 'none') {
    document.getElementById('bulkStudentInput').focus();
  }
};

async function saveStudents() {
  const teamId = currentTeamData.id;
  const fetcher = window.teamFetch || fetch;
  const status = document.getElementById('studentStatus');
  status.textContent = 'กำลังบันทึก...';
  status.style.color = 'var(--muted)';
  try {
    const res = await fetcher(`/api/teams/${teamId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ students: currentTeamData.students })
    });
    if (res.ok) {
      status.textContent = 'บันทึกรายชื่อสำเร็จ';
      status.style.color = '#22c55e';
      setTimeout(() => status.textContent = '', 2000);
    } else {
      status.textContent = 'บันทึกไม่สำเร็จ';
      status.style.color = '#ef4444';
    }
  } catch (err) {
    status.textContent = 'เกิดข้อผิดพลาดในการเชื่อมต่อ';
    status.style.color = '#ef4444';
  }
}

// --- API Key ---
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
