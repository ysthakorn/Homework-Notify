const manualForm = document.getElementById('manualForm');
const manualSubmitBtn = document.getElementById('manualSubmitBtn');
const manualStatus = document.getElementById('manualStatus');

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

if (manualForm) {
  manualForm.onsubmit = async (e) => {
    e.preventDefault();
    manualSubmitBtn.disabled = true;
    setStatus(manualStatus, 'กำลังส่ง...');

    const payload = Object.fromEntries(new FormData(manualForm));
    payload.teamId = localStorage.getItem('activeTeamId');

    try {
      await requestJson('/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setStatus(manualStatus, 'ส่งสำเร็จ');
      manualForm.reset();
    } catch (err) {
      setStatus(manualStatus, err.message || 'ส่งไม่สำเร็จ', true);
    } finally {
      manualSubmitBtn.disabled = false;
    }
  };
}

const sheetHint = document.getElementById('sheetHint');
window.addEventListener('teamChanged', async () => {
  const teamId = localStorage.getItem('activeTeamId');
  if (!teamId || !sheetHint) return;

  try {
    const res = await requestJson('/api/teams');
    const team = res.teams.find(t => t.id === teamId);
    if (team) {
      if (!team.googleSheetCsvUrl) {
        sheetHint.textContent = 'Not configured';
        sheetHint.classList.add('danger');
      } else {
        sheetHint.textContent = 'Configured';
        sheetHint.classList.remove('danger');
      }
    }
  } catch (err) {}
});
