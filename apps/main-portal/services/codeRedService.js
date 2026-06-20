const fs = require('fs');
const path = require('path');
const teamService = require('./teamService');
const homeworkService = require('./homeworkService');
const { pushFlexMessage } = require('./lineClient');

const LOG_FILE = path.join(__dirname, '../../../data/code_red_log.json');
const CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const DEADLINE_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

function readLog() {
  try {
    if (!fs.existsSync(LOG_FILE)) return {};
    return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function writeLog(log) {
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2), 'utf8');
}

function buildCodeRedFlex(homework, notSubmittedNames) {
  const listItems = notSubmittedNames.slice(0, 10).map(name => ({
    type: "text",
    text: `• ${name}`,
    color: "#ffffff",
    size: "sm",
    margin: "xs"
  }));

  if (notSubmittedNames.length > 10) {
    listItems.push({
      type: "text",
      text: `...และอีก ${notSubmittedNames.length - 10} คน`,
      color: "#ffcccc",
      size: "xs",
      margin: "xs"
    });
  }

  return {
    type: "flex",
    altText: `🚨 Code Red: ${homework.title} ใกล้ถึงกำหนดส่ง!`,
    contents: {
      type: "bubble",
      size: "kilo",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "🚨 CODE RED",
            weight: "bold",
            color: "#ffffff",
            size: "xl"
          },
          {
            type: "text",
            text: "ใกล้ถึงกำหนดส่งแล้ว!",
            color: "#ffcccc",
            size: "sm",
            margin: "xs"
          }
        ],
        backgroundColor: "#dc2626",
        paddingTop: "14px",
        paddingBottom: "14px"
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        backgroundColor: "#ffffffff",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "วิชา", color: "#ff0000ff", size: "sm", flex: 1 },
              { type: "text", text: homework.subject || "-", color: "#000000ff", size: "sm", flex: 3, wrap: true }
            ]
          },
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "งาน", color: "#ff0000ff", size: "sm", flex: 1 },
              { type: "text", text: homework.title || "-", color: "#000000ff", size: "sm", flex: 3, wrap: true, weight: "bold" }
            ]
          },
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "กำหนด", color: "#ff0000ff", size: "sm", flex: 1 },
              { type: "text", text: formatDue(homework.due), color: "#fbbf24", size: "sm", flex: 3, weight: "bold" }
            ]
          },
          { type: "separator", color: "#991b1b", margin: "md" },
          {
            type: "text",
            text: `❌ ยังไม่ส่ง (${notSubmittedNames.length} คน):`,
            color: "#000000ff",
            size: "sm",
            weight: "bold",
            margin: "md"
          },
          ...listItems
        ]
      }
    }
  };
}

function formatDue(dueStr) {
  if (!dueStr) return '-';
  try {
    const d = new Date(dueStr);
    if (isNaN(d.getTime())) return dueStr;
    return d.toLocaleString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return dueStr;
  }
}

async function checkDeadlines() {
  const now = new Date();
  const log = readLog();
  const teams = teamService.getAllTeams();
  let totalAlerts = 0;

  for (const team of teams) {
    if (!team.codeRedEnabled) continue;
    if ((!team.lineAccessTokens || team.lineAccessTokens.length === 0) || !team.lineGroupId) continue;

    const allHw = homeworkService.getHomeworkByTeam(team.id);
    const students = (team.students || []).map(s => typeof s === 'string' ? s : s.name);

    for (const hw of allHw) {
      if (hw.status !== 'active') continue;
      if (!hw.due) continue;

      const dueDate = new Date(hw.due);
      if (isNaN(dueDate.getTime())) continue;

      const timeUntilDue = dueDate.getTime() - now.getTime();

      // Only alert if due is within 24 hours AND not already past
      if (timeUntilDue <= 0 || timeUntilDue > DEADLINE_WINDOW_MS) continue;

      // Check if we already sent a Code Red for this homework
      const logKey = `${hw.id}_${dueDate.toISOString().split('T')[0]}`;
      if (log[logKey]) continue;

      // Find who hasn't submitted
      const submissions = hw.submissions || {};
      const notSubmitted = students.filter(s => !submissions[s]);

      if (notSubmitted.length === 0) continue; // Everyone submitted

      // Send Code Red!
      try {
        const flexMsg = buildCodeRedFlex(hw, notSubmitted);
        await pushFlexMessage(flexMsg, team.lineGroupId, team.lineAccessTokens, 10000);

        // Log that we sent this alert
        log[logKey] = {
          sentAt: now.toISOString(),
          teamId: team.id,
          hwTitle: hw.title,
          notSubmittedCount: notSubmitted.length
        };
        totalAlerts++;

        console.log(`[Code Red] Sent alert for "${hw.title}" (${team.name}) — ${notSubmitted.length} students pending`);
      } catch (err) {
        console.error(`[Code Red] Failed to send alert for "${hw.title}":`, err.message);
      }
    }
  }

  // Save log
  writeLog(log);

  if (totalAlerts > 0) {
    console.log(`[Code Red] Check complete: ${totalAlerts} alert(s) sent`);
  }
}

function startCodeRedScheduler() {
  console.log(`[Code Red] Scheduler started (checking every ${CHECK_INTERVAL_MS / 60000} minutes)`);

  // Initial check after 10 seconds (let server boot up)
  setTimeout(() => {
    checkDeadlines().catch(err => console.error('[Code Red] Initial check failed:', err));
  }, 10000);

  // Then check periodically
  setInterval(() => {
    checkDeadlines().catch(err => console.error('[Code Red] Scheduled check failed:', err));
  }, CHECK_INTERVAL_MS);
}

module.exports = {
  checkDeadlines,
  startCodeRedScheduler,
};
