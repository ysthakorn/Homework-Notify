const fs = require('fs');
const path = require('path');

const AUDIT_FILE = path.join(__dirname, '../../../data/audit.json');

function readAuditLogs() {
  try {
    if (!fs.existsSync(AUDIT_FILE)) return [];
    return JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}

function writeAuditLogs(logs) {
  try {
    // Keep only last 500 logs to prevent file bloat
    if (logs.length > 500) logs = logs.slice(0, 500);
    fs.writeFileSync(AUDIT_FILE, JSON.stringify(logs, null, 2), 'utf8');
  } catch (e) {
    console.error("Failed to write audit logs", e);
  }
}

function logAction({ userEmail, action, teamId, status, details }) {
  const logs = readAuditLogs();
  logs.unshift({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    userEmail: userEmail || 'unknown',
    action,
    teamId: teamId || 'system',
    status,
    details
  });
  writeAuditLogs(logs);
}

module.exports = {
  readAuditLogs,
  logAction
};
