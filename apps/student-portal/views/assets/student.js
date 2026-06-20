let teamsCache = [];

// Initialize flatpickr for 24-hour due date picker
flatpickr("#duePicker", {
  enableTime: true,
  dateFormat: "Y-m-d\\TH:i",
  time_24hr: true
});

async function init() {
  try {
    const res = await fetch('/api/teams');
    const data = await res.json();
    if (data.ok) {
      teamsCache = data.teams;
      
      const optionsContainer = document.getElementById('teamSelectOptions');
      if (teamsCache.length > 0) {
        document.getElementById('teamSelectLabel').textContent = '-- เลือกทีม / ห้องเรียน --';
        optionsContainer.innerHTML = teamsCache.map(t => 
          `<div class="custom-option" data-value="${t.id}">${t.name}</div>`
        ).join('');
        
        // Add click listeners to options
        document.querySelectorAll('.custom-option').forEach(opt => {
          opt.addEventListener('click', function() {
            selectTeam(this.dataset.value, this.textContent);
          });
        });
      } else {
        document.getElementById('teamSelectLabel').textContent = 'ไม่พบข้อมูลทีม';
      }
    }
  } catch (err) {
    console.error('Failed to load teams', err);
    document.getElementById('teamSelectLabel').textContent = 'โหลดข้อมูลไม่สำเร็จ';
  }
}

// Custom Select Toggle Logic
const selectContainer = document.getElementById('teamSelectContainer');
const selectTrigger = document.getElementById('teamSelectTrigger');

selectTrigger.addEventListener('click', (e) => {
  selectContainer.classList.toggle('open');
  e.stopPropagation();
});

document.addEventListener('click', () => {
  selectContainer.classList.remove('open');
});

function selectTeam(teamId, teamName) {
  // Update hidden input
  const hiddenInput = document.getElementById('teamSelect');
  hiddenInput.value = teamId;
  
  // Update Label
  document.getElementById('teamSelectLabel').textContent = teamName;
  
  // Highlight selected option
  document.querySelectorAll('.custom-option').forEach(opt => {
    opt.classList.remove('selected');
    if (opt.dataset.value === teamId) {
      opt.classList.add('selected');
    }
  });

  // Handle section visibility
  const requestSection = document.getElementById('requestSection');
  const pendingSection = document.getElementById('pendingSection');
  
  if (!teamId) {
    requestSection.style.display = 'none';
    pendingSection.style.display = 'none';
    return;
  }

  requestSection.style.display = 'block';
  pendingSection.style.display = 'block';
  loadPending(teamId);
}

async function loadPending(teamId) {
  const pendingList = document.getElementById('pendingList');
  pendingList.innerHTML = '<div class="muted">กำลังโหลด...</div>';
  
  try {
    const res = await fetch(`/api/pending?teamId=${teamId}`);
    const data = await res.json();
    
    if (data.ok && data.homework && data.homework.length > 0) {
      pendingList.innerHTML = data.homework.map(hw => `
        <div class="request-item">
          <div class="request-header">
            <span class="request-title">${hw.subject}: ${hw.title}</span>
            <span class="request-badge">รออนุมัติ</span>
          </div>
          ${hw.due ? `<div class="request-detail">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            กำหนดส่ง: ${formatDue(hw.due)}
          </div>` : ''}
        </div>
      `).join('');
    } else {
      pendingList.innerHTML = '<div class="muted">ไม่มีคำขอรออนุมัติในขณะนี้</div>';
    }
  } catch (err) {
    pendingList.innerHTML = '<div class="muted" style="color:var(--danger)">โหลดข้อมูลไม่สำเร็จ</div>';
  }
}

function formatDue(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const pad = v => String(v).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} @ ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

document.getElementById('requestForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const teamId = document.getElementById('teamSelect').value;
  
  if (!teamId) {
    alert('กรุณาเลือกทีมก่อน');
    return;
  }

  const form = e.target;
  const btn = document.getElementById('submitBtn');
  const status = document.getElementById('submitStatus');
  
  let dueStr = form.due.value;
  if (dueStr) {
    // Append timezone offset to make it a full ISO string
    dueStr = dueStr + form.timezone.value;
  }

  const payload = {
    teamId,
    studentName: 'นักเรียนในห้อง', // Default name since we removed the input
    subject: form.subject.value.trim(),
    title: form.title.value.trim(),
    detail: form.detail.value.trim(),
    due: dueStr,
  };

  btn.disabled = true;
  btn.innerHTML = 'กำลังส่ง...';

  try {
    const res = await fetch('/api/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (data.ok) {
      status.textContent = 'ส่งคำขอสำเร็จ! กรุณารออาจารย์อนุมัติ';
      status.style.color = 'var(--success)';
      form.reset();
      loadPending(teamId);
    } else {
      status.textContent = data.error || 'เกิดข้อผิดพลาด';
      status.style.color = 'var(--danger)';
    }
  } catch (err) {
    status.textContent = 'เชื่อมต่อ server ไม่ได้';
    status.style.color = 'var(--danger)';
  }

  btn.disabled = false;
  btn.innerHTML = `
    <span>ส่งคำขอเพิ่มการบ้าน</span>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
  `;
  setTimeout(() => { status.textContent = ''; }, 5000);
});

init();
