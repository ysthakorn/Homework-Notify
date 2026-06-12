const healthValue = document.getElementById('healthValue');
const configValue = document.getElementById('configValue');
const statusUpdated = document.getElementById('statusUpdated');

async function requestJson(url) {
  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || 'request_failed');
  }
  return body;
}

function setBadge(el, ok, text) {
  el.textContent = text;
  el.style.color = ok ? '#22c55e' : '#ef4444';
}

async function loadStatus() {
  try {
    const health = await requestJson('/health');
    setBadge(healthValue, health.ok, health.ok ? 'OK' : 'Fail');
  } catch (_) {
    setBadge(healthValue, false, 'Fail');
  }

  try {
    const config = await requestJson('/api/config');
    setBadge(configValue, config.hasGoogleSheet, config.hasGoogleSheet ? 'Configured' : 'Missing');
  } catch (_) {
    setBadge(configValue, false, 'Unknown');
  }

  const now = new Date();
  statusUpdated.textContent = now.toLocaleString();
}

loadStatus();
