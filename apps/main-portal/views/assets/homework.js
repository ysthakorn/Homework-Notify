let homeworkList = [];
let pendingList = [];
let currentModalHw = null;
let currentTab = 'active';
let teamStudents = [];

// Initialize flatpickr for 24-hour due date picker
flatpickr("#duePicker", {
  enableTime: true,
  dateFormat: "Y-m-d\\TH:i",
  time_24hr: true
});

// --- Format helpers ---
function formatDue(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const pad = v => String(v).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} @ ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'เมื่อสักครู่';
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ชม.ที่แล้ว`;
  const days = Math.floor(hours / 24);
  return `${days} วันที่แล้ว`;
}

function getDueStatus(dateStr) {
  if (!dateStr) return { label: '-', cls: '' };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { label: dateStr, cls: '' };
  const now = Date.now();
  const diff = d.getTime() - now;
  if (diff < 0) return { label: 'เลยกำหนดแล้ว', cls: 'overdue' };
  if (diff < 86400000) return { label: 'ใกล้ deadline', cls: 'urgent' };
  return { label: formatDue(dateStr), cls: '' };
}

// --- Load homework ---
async function loadHomework() {
  const teamId = localStorage.getItem('activeTeamId');
  if (!teamId) return;

  try {
    const res = await fetch(`/api/homework?teamId=${teamId}`);
    const data = await res.json();
    if (data.ok) {
      homeworkList = data.homework || [];
    }

    const resPending = await fetch(`/api/homework/pending?teamId=${teamId}`);
    const dataPending = await resPending.json();
    if (dataPending.ok) {
      pendingList = dataPending.homework || [];
    }
    
    if (currentTab === 'active') {
      renderHomeworkTable();
    } else {
      renderPendingTable();
    }
    updateBadge();
  } catch (err) {
    console.error('Failed to load homework', err);
  }

  // Also load team students
  try {
    const res = await fetch(`/api/teams/${teamId}`);
    const data = await res.json();
    if (data.ok) {
      teamStudents = data.team.students || [];
    }
  } catch (err) {
    console.error('Failed to load team', err);
  }
}

function renderHomeworkTable() {
  const tbody = document.getElementById('hwRows');
  const empty = document.getElementById('homeworkEmpty');
  const wrap = document.getElementById('homeworkTableWrap');
  const count = document.getElementById('hwCount');

  if (homeworkList.length === 0) {
    empty.style.display = 'block';
    wrap.style.display = 'none';
    count.textContent = '';
    return;
  }

  empty.style.display = 'none';
  wrap.style.display = 'block';
  count.textContent = `(${homeworkList.length})`;

  tbody.innerHTML = homeworkList.map((hw, i) => {
    const submittedCount = Object.keys(hw.submissions || {}).length;
    const totalStudents = teamStudents.length;
    const pct = totalStudents > 0 ? Math.round((submittedCount / totalStudents) * 100) : 0;
    const dueStatus = getDueStatus(hw.due);
    
    const progressColor = pct >= 100 ? 'var(--success)' 
      : pct >= 50 ? 'var(--primary)' 
      : pct > 0 ? 'var(--warning)' 
      : 'var(--muted)';

    return `
      <tr>
        <td style="color:var(--muted)">${i + 1}</td>
        <td><strong style="color:var(--ink)">${hw.subject}</strong></td>
        <td>
          <div style="color:var(--ink)">${hw.title}</div>
          ${hw.detail ? `<div class="muted" style="font-size:0.76rem;margin-top:2px">${hw.detail.substring(0, 60)}${hw.detail.length > 60 ? '...' : ''}</div>` : ''}
        </td>
        <td>
          <div style="font-size:0.82rem">${formatDue(hw.due)}</div>
          ${dueStatus.cls ? `<span class="due-badge ${dueStatus.cls}">${dueStatus.label}</span>` : ''}
        </td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div class="progress-bar-mini">
              <div class="progress-bar-fill" style="width:${pct}%;background:${progressColor}"></div>
            </div>
            <span style="font-size:0.78rem;color:var(--ink-secondary);white-space:nowrap">${submittedCount}/${totalStudents}</span>
          </div>
        </td>
        <td>
          <div style="display:flex;gap:6px;flex-wrap:nowrap">
            <button type="button" class="ghost action-btn" onclick="openSubmissionModal('${hw.id}')" title="ดูสถานะการส่ง">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </button>
            <button type="button" class="ghost action-btn" onclick="sendHomeworkToLine('${hw.id}')" title="ส่งแจ้งเตือนเข้า LINE">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
            </button>
            <button type="button" class="ghost action-btn danger-action" onclick="deleteHomework('${hw.id}')" title="ลบ">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function updateBadge() {
  const badge = document.getElementById('pendingBadge');
  if (pendingList.length > 0) {
    badge.textContent = pendingList.length;
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }
}

window.switchTab = function(tab) {
  currentTab = tab;
  const tabActive = document.getElementById('tabActiveHw');
  const tabPending = document.getElementById('tabPendingHw');
  const syncBtn = document.getElementById('syncBtn');
  
  if (tab === 'active') {
    tabActive.classList.add('active');
    tabActive.style.borderBottom = '2px solid var(--primary)';
    tabActive.style.color = 'var(--ink)';
    
    tabPending.classList.remove('active');
    tabPending.style.borderBottom = 'none';
    tabPending.style.color = 'var(--muted)';
    
    syncBtn.style.display = 'inline-flex';
    renderHomeworkTable();
  } else {
    tabPending.classList.add('active');
    tabPending.style.borderBottom = '2px solid var(--primary)';
    tabPending.style.color = 'var(--ink)';
    
    tabActive.classList.remove('active');
    tabActive.style.borderBottom = 'none';
    tabActive.style.color = 'var(--muted)';
    
    syncBtn.style.display = 'none';
    renderPendingTable();
  }
};

function renderPendingTable() {
  const tbody = document.getElementById('hwRows');
  const empty = document.getElementById('homeworkEmpty');
  const wrap = document.getElementById('homeworkTableWrap');
  const count = document.getElementById('hwCount');

  if (pendingList.length === 0) {
    empty.style.display = 'block';
    empty.textContent = 'ไม่มีคำขอใหม่ที่รออนุมัติ';
    wrap.style.display = 'none';
    count.textContent = '';
    return;
  }

  empty.style.display = 'none';
  wrap.style.display = 'block';
  count.textContent = `(${pendingList.length})`;

  tbody.innerHTML = pendingList.map((hw, i) => {
    return `
      <tr>
        <td style="color:var(--muted)">${i + 1}</td>
        <td><strong style="color:var(--ink)">${hw.subject}</strong></td>
        <td>
          <div style="color:var(--ink)">${hw.title}</div>
          ${hw.detail ? `<div class="muted" style="font-size:0.76rem;margin-top:2px">${hw.detail.substring(0, 60)}${hw.detail.length > 60 ? '...' : ''}</div>` : ''}
        </td>
        <td>
          <div style="font-size:0.82rem">${formatDue(hw.due)}</div>
        </td>
        <td>
          <span class="due-badge urgent" style="background:#fef3c7; color:#b45309">รออนุมัติ</span>
          <div style="font-size: 0.75rem; color: var(--muted); margin-top: 4px;">โดย: ${hw.createdBy}</div>
        </td>
        <td>
          <div style="display:flex;gap:6px;flex-wrap:nowrap">
            <button type="button" class="btn-success" onclick="approveHomework('${hw.id}')" title="อนุมัติ" style="padding: 4px 8px; font-size: 0.8rem;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><path d="M20 6L9 17l-5-5"/></svg>
              Approve
            </button>
            <button type="button" class="ghost action-btn danger-action" onclick="rejectHomework('${hw.id}')" title="ปฏิเสธ">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.approveHomework = async function(hwId) {
  const teamId = localStorage.getItem('activeTeamId');
  if (!confirm('ยืนยันอนุมัติคำขอนี้? (ระบบจะเพิ่มเป็นการบ้านและส่ง LINE แจ้งเตือน)')) return;

  try {
    const res = await fetch(`/api/homework/${hwId}/approve?teamId=${teamId}`, { method: 'POST' });
    if (res.ok) {
      await loadHomework();
    } else {
      alert('อนุมัติไม่สำเร็จ');
    }
  } catch (err) {
    alert('เชื่อมต่อ server ไม่ได้');
  }
};

window.rejectHomework = async function(hwId) {
  const teamId = localStorage.getItem('activeTeamId');
  const reason = prompt('ระบุเหตุผลที่ปฏิเสธ (ข้ามได้):');
  if (reason === null) return; // cancelled

  try {
    const res = await fetch(`/api/homework/${hwId}/reject?teamId=${teamId}`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    if (res.ok) {
      await loadHomework();
    } else {
      alert('ปฏิเสธไม่สำเร็จ');
    }
  } catch (err) {
    alert('เชื่อมต่อ server ไม่ได้');
  }
};

// --- Create homework ---
document.getElementById('createForm').onsubmit = async (e) => {
  e.preventDefault();
  const teamId = localStorage.getItem('activeTeamId');
  if (!teamId) return;

  const form = e.target;
  const btn = document.getElementById('createBtn');
  const status = document.getElementById('createStatus');
  let dueStr = form.due.value;
  if (dueStr) {
    dueStr = dueStr + form.timezone.value;
  }

  const payload = {
    teamId,
    subject: form.subject.value.trim(),
    title: form.title.value.trim(),
    detail: form.detail.value.trim(),
    due: dueStr,
  };

  btn.disabled = true;
  btn.textContent = 'กำลังเพิ่ม...';

  try {
    const res = await fetch('/api/homework', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (data.ok) {
      status.textContent = 'เพิ่มการบ้านสำเร็จ!';
      status.style.color = '#22c55e';
      form.reset();

      // Also notify LINE if checkbox checked
      if (document.getElementById('alsoNotifyLine').checked) {
        try {
          await fetch('/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...payload, hwId: data.homework.id }),
          });
          status.textContent = 'เพิ่มการบ้านสำเร็จ + ส่ง LINE แล้ว!';
        } catch (lineErr) {
          status.textContent = 'เพิ่มสำเร็จ แต่ส่ง LINE ไม่สำเร็จ';
          status.style.color = '#eab308';
        }
      }

      await loadHomework();
    } else {
      status.textContent = data.error || 'เกิดข้อผิดพลาด';
      status.style.color = '#ef4444';
    }
  } catch (err) {
    status.textContent = 'เชื่อมต่อ server ไม่ได้';
    status.style.color = '#ef4444';
  }

  btn.disabled = false;
  btn.textContent = 'เพิ่มการบ้าน';
  setTimeout(() => { status.textContent = ''; }, 4000);
};

// --- Send homework notification to LINE ---
window.sendHomeworkToLine = async function(hwId) {
  const hw = homeworkList.find(h => h.id === hwId);
  if (!hw) return;

  const teamId = localStorage.getItem('activeTeamId');
  if (!confirm(`ส่งแจ้งเตือนการบ้าน "${hw.title}" เข้า LINE?`)) return;

  try {
    const res = await fetch('/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teamId,
        hwId: hw.id,
        subject: hw.subject,
        title: hw.title,
        detail: hw.detail,
        due: hw.due,
      }),
    });
    if (res.ok) {
      alert('ส่งแจ้งเตือนเข้า LINE สำเร็จ!');
    } else {
      const data = await res.json();
      alert('ส่งไม่สำเร็จ: ' + (data.error || 'unknown error'));
    }
  } catch (err) {
    alert('เชื่อมต่อ server ไม่ได้');
  }
};

// --- Delete homework ---
window.deleteHomework = async function(hwId) {
  const teamId = localStorage.getItem('activeTeamId');
  if (!confirm('ลบการบ้านนี้?')) return;

  try {
    const res = await fetch(`/api/homework/${hwId}?teamId=${teamId}`, { method: 'DELETE' });
    if (res.ok) {
      await loadHomework();
    } else {
      alert('ลบไม่สำเร็จ');
    }
  } catch (err) {
    alert('เชื่อมต่อ server ไม่ได้');
  }
};

// --- Submission Modal ---
window.openSubmissionModal = function(hwId) {
  const hw = homeworkList.find(h => h.id === hwId);
  if (!hw) return;
  currentModalHw = hw;

  document.getElementById('modalTitle').textContent = hw.title;
  document.getElementById('modalSubtitle').textContent = `${hw.subject} · กำหนดส่ง: ${formatDue(hw.due)}`;

  renderSubmissionChecklist();
  document.getElementById('submissionModal').classList.add('show');
};

window.closeSubmissionModal = function() {
  document.getElementById('submissionModal').classList.remove('show');
  currentModalHw = null;
};

function renderSubmissionChecklist() {
  const checklist = document.getElementById('studentChecklist');
  const noStudents = document.getElementById('noStudentsMsg');
  const summaryBar = document.getElementById('modalSummaryBar');

  if (teamStudents.length === 0) {
    checklist.innerHTML = '';
    noStudents.style.display = 'block';
    summaryBar.innerHTML = '';
    return;
  }

  noStudents.style.display = 'none';

  const submissions = currentModalHw.submissions || {};
  const studentNames = teamStudents.map(s => typeof s === 'string' ? s : s.name);
  const submittedCount = studentNames.filter(s => submissions[s]).length;
  const total = studentNames.length;
  const pct = Math.round((submittedCount / total) * 100);

  summaryBar.innerHTML = `
    <div class="submission-summary-bar">
      <div class="summary-stats">
        <div class="stat-item stat-done">
          <span class="stat-number">${submittedCount}</span>
          <span class="stat-label">ส่งแล้ว</span>
        </div>
        <div class="stat-item stat-pending">
          <span class="stat-number">${total - submittedCount}</span>
          <span class="stat-label">ยังไม่ส่ง</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">${pct}%</span>
          <span class="stat-label">ทั้งหมด</span>
        </div>
      </div>
      <div class="progress-bar">
        <div class="progress-bar-fill" style="width:${pct}%;background:${pct >= 100 ? 'var(--success)' : 'var(--primary)'}"></div>
      </div>
    </div>
  `;

  checklist.innerHTML = studentNames.map((student, i) => {
    const isSubmitted = !!submissions[student];
    const submittedAt = isSubmitted ? timeAgo(submissions[student].submittedAt) : '';

    return `
      <label class="student-check-item ${isSubmitted ? 'is-checked' : ''}" data-student="${student}">
        <input type="checkbox" ${isSubmitted ? 'checked' : ''} onchange="toggleSubmission('${student.replace(/'/g, "\\'")}', this.checked)">
        <span class="check-number">${i + 1}</span>
        <span class="check-name">${student}</span>
        <span class="check-status">${isSubmitted ? `✅ ${submittedAt}` : '⏳'}</span>
      </label>
    `;
  }).join('');
}

window.toggleSubmission = async function(studentName, checked) {
  const teamId = localStorage.getItem('activeTeamId');
  if (!currentModalHw) return;

  try {
    if (checked) {
      await fetch(`/api/homework/${currentModalHw.id}/submit?teamId=${teamId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentName }),
      });
      // Update local state
      if (!currentModalHw.submissions) currentModalHw.submissions = {};
      currentModalHw.submissions[studentName] = {
        submittedAt: new Date().toISOString(),
        submittedBy: 'me',
      };
    } else {
      await fetch(`/api/homework/${currentModalHw.id}/submit?teamId=${teamId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentName }),
      });
      if (currentModalHw.submissions) {
        delete currentModalHw.submissions[studentName];
      }
    }
    renderSubmissionChecklist();
    renderHomeworkTable();
  } catch (err) {
    console.error('Failed to toggle submission', err);
  }
};

// --- Send summary to LINE ---
window.sendSummaryToLine = async function() {
  if (!currentModalHw) return;
  const teamId = localStorage.getItem('activeTeamId');
  const btn = document.getElementById('notifySummaryBtn');
  
  btn.disabled = true;
  btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;animation:spin 1s linear infinite"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg> กำลังส่ง...`;

  try {
    const res = await fetch(`/api/homework/${currentModalHw.id}/notify-summary?teamId=${teamId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    const data = await res.json();
    if (data.ok) {
      btn.innerHTML = `✅ ส่งสำเร็จ!`;
      btn.style.background = 'var(--success)';
      setTimeout(() => {
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg> ส่งสรุปเข้า LINE`;
        btn.style.background = '';
      }, 2000);
    } else {
      alert('ส่งไม่สำเร็จ: ' + (data.error || 'unknown'));
    }
  } catch (err) {
    alert('เชื่อมต่อ server ไม่ได้');
  }

  btn.disabled = false;
};

// --- Sync from Google Form ---
window.syncFromGoogleForm = async function() {
  const teamId = localStorage.getItem('activeTeamId');
  if (!teamId) return;

  const btn = document.getElementById('syncBtn');
  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;animation:spin 1s linear infinite"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg> กำลัง Sync...`;

  try {
    const res = await fetch(`/api/homework/sync?teamId=${teamId}`, { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      alert(`Sync สำเร็จ! อัปเดตข้อมูลการส่งงาน ${data.syncedCount} รายการ`);
      await loadHomework();
    } else {
      alert('Sync ไม่สำเร็จ: ' + (data.error || 'unknown error'));
    }
  } catch (err) {
    alert('เชื่อมต่อ server ไม่ได้');
  }

  btn.disabled = false;
  btn.innerHTML = originalHtml;
};

// --- Close modal on backdrop click ---
document.getElementById('submissionModal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeSubmissionModal();
});

// --- Team changed event ---
window.addEventListener('teamChanged', loadHomework);
document.addEventListener('DOMContentLoaded', loadHomework);
