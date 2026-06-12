const sheetRows = document.getElementById('sheetRows');
const sheetStatus = document.getElementById('sheetStatus');
const reloadSheetBtn = document.getElementById('reloadSheetBtn');
const sheetHint = document.getElementById('sheetHint');
let sheetData = [];

function setStatus(el, text, isError = false) {
  el.textContent = text;
  el.style.color = isError ? '#ef4444' : '#22c55e';
}

async function requestJson(url, options = {}) {
  const res = await (window.teamFetch ? window.teamFetch(url, options) : fetch(url, options));
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || 'request_failed');
  }
  return body;
}

function rowHtml(row, index) {
  const safe = (v) => (v || '-').toString();
  return `
    <tr>
      <td>${safe(row.rowId)}</td>
      <td>${safe(row.subject)}</td>
      <td>${safe(row.title)}</td>
      <td>${safe(row.detail)}</td>
      <td>${safe(row.due)}</td>
      <td class="row-send">
        <button type="button" data-row-index="${index}" class="send-row-btn">ส่งแถวนี้</button>
      </td>
    </tr>
  `;
}

async function loadSheetRows() {
  sheetRows.innerHTML = '<tr><td colspan="6" class="muted">กำลังโหลด...</td></tr>';
  sheetStatus.textContent = '';

  try {
    const teamId = localStorage.getItem('activeTeamId');
    if (!teamId) return;

    const data = await requestJson(`/api/sheet-rows?teamId=${teamId}`);
    if (!data.rows || data.rows.length === 0) {
      sheetRows.innerHTML = '<tr><td colspan="6" class="muted">ไม่มีข้อมูลในชีต</td></tr>';
      setStatus(sheetStatus, 'โหลดสำเร็จ แต่ยังไม่มีแถวข้อมูล');
      return;
    }

    sheetData = data.rows;
    sheetRows.innerHTML = data.rows.map(rowHtml).join('');
    setStatus(sheetStatus, `โหลดสำเร็จ ${data.rows.length} แถว`);
  } catch (err) {
    sheetData = [];
    sheetRows.innerHTML = '<tr><td colspan="6" class="danger">โหลดข้อมูลจากชีตไม่สำเร็จ</td></tr>';
    setStatus(sheetStatus, err.message || 'โหลดข้อมูลล้มเหลว', true);
  }
}

sheetRows.onclick = async (e) => {
  const button = e.target.closest('.send-row-btn');
  if (!button) {
    return;
  }

  const rowIndex = Number(button.getAttribute('data-row-index'));
  const rowData = sheetData[rowIndex];
  if (!rowData) {
    setStatus(sheetStatus, 'ข้อมูลแถวไม่ถูกต้อง', true);
    return;
  }

  button.disabled = true;
  button.textContent = 'กำลังส่ง...';
  try {
    const payload = { ...rowData, teamId: localStorage.getItem('activeTeamId') };
    await requestJson('/notify-row', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    button.textContent = 'ส่งแล้ว';
    setStatus(sheetStatus, `ส่งแถว ${rowData.rowId || ''} สำเร็จ`);
  } catch (err) {
    button.disabled = false;
    button.textContent = 'ส่งแถวนี้';
    setStatus(sheetStatus, err.message || 'ส่งไม่สำเร็จ', true);
  }
};

reloadSheetBtn.onclick = () => {
  loadSheetRows();
};

window.addEventListener('teamChanged', loadSheetRows);

// Remove the initial load call since teamChanged will trigger it
(async () => {
  // We can fetch config here if needed, but we rely on team data now
})();
