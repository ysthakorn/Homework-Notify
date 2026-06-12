const envForm = document.getElementById('envForm');
const envStatus = document.getElementById('envStatus');
const envFields = document.getElementById('envFields');
const toggleTokenBtn = document.getElementById('toggleToken');

const ENV_SCHEMA = [
  {
    key: 'LINE_ACCESS_TOKEN',
    label: 'LINE Access Token',
    hint: 'Channel Access Token (Long-lived) จาก LINE Developers Console',
    type: 'password',
    placeholder: 'YOUR_TOKEN_HERE',
  },
  {
    key: 'LINE_GROUP_ID',
    label: 'LINE Group ID',
    hint: 'Group ID ของกลุ่ม LINE ที่ต้องการส่งข้อความ',
    type: 'text',
    placeholder: 'YOUR_GROUP_ID_HERE',
  },
  {
    key: 'PORT',
    label: 'Port',
    hint: 'พอร์ตสำหรับรัน server (เปลี่ยนแล้วต้อง restart)',
    type: 'text',
    placeholder: '8080',
  },
  {
    key: 'LINE_REQUEST_TIMEOUT_SEC',
    label: 'Request Timeout (sec)',
    hint: 'timeout สำหรับ LINE API request เป็นวินาที',
    type: 'text',
    placeholder: '10',
  },
  {
    key: 'GOOGLE_SHEET_CSV_URL',
    label: 'Google Sheet CSV URL',
    hint: 'URL export CSV เช่น https://docs.google.com/spreadsheets/d/SHEET_ID/export?format=csv&gid=0',
    type: 'url',
    placeholder: 'https://docs.google.com/spreadsheets/d/.../export?format=csv&gid=0',
  },
];

function setStatus(text, isError = false) {
  envStatus.textContent = text;
  envStatus.style.color = isError ? '#ef4444' : '#22c55e';
}

function buildFields(values) {
  envFields.innerHTML = ENV_SCHEMA.map((field) => {
    const value = values[field.key] || '';
    const inputType = field.type || 'text';
    const isPassword = inputType === 'password';

    return `
      <div class="env-row">
        <div class="env-row-header">
          <label class="env-key" for="env-${field.key}">${field.key}</label>
          ${isPassword ? '<button type="button" class="ghost toggle-vis" data-target="env-' + field.key + '">Show</button>' : ''}
        </div>
        <span class="env-hint">${field.hint}</span>
        <input
          id="env-${field.key}"
          name="${field.key}"
          type="${inputType}"
          value="${escapeAttr(value)}"
          placeholder="${field.placeholder}"
          autocomplete="off"
          spellcheck="false"
        >
      </div>
    `;
  }).join('');
}

function escapeAttr(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

async function loadEnv() {
  try {
    const res = await fetch('/api/env');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'failed');
    buildFields(data.values || {});
  } catch (err) {
    setStatus('โหลด env ไม่สำเร็จ: ' + err.message, true);
  }
}

envForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(envForm);
  const values = Object.fromEntries(formData);

  setStatus('กำลังบันทึก...');

  try {
    const res = await fetch('/api/env', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'failed');
    setStatus('บันทึกสำเร็จ — ค่าใหม่มีผลทันที');
  } catch (err) {
    setStatus('บันทึกไม่สำเร็จ: ' + err.message, true);
  }
});

envFields.addEventListener('click', (e) => {
  const btn = e.target.closest('.toggle-vis');
  if (!btn) return;

  const targetId = btn.getAttribute('data-target');
  const input = document.getElementById(targetId);
  if (!input) return;

  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = 'Hide';
  } else {
    input.type = 'password';
    btn.textContent = 'Show';
  }
});

loadEnv();
