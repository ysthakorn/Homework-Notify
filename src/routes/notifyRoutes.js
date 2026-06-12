const express = require("express");
const path = require("path");

const { buildHomeworkMessage } = require("../services/messageBuilder");
const { pushTextMessage } = require("../services/lineClient");
const { fetchHomeworkRows } = require("../services/sheetService");
const { readEnv, writeEnv } = require("../services/envService");
const env = require("../config/env");
const teamService = require("../services/teamService");
const auditService = require("../services/auditService");

const router = express.Router();

// --- Auth Middlewares ---
function extractUser(req, res, next) {
  const email = req.headers['cf-access-authenticated-user-email'];
  req.userEmail = email ? email : 'dev@localhost';
  next();
}

const ADMIN_EMAILS = ['thakornlim123@gmail.com', 'dev@localhost'];
function requireAdmin(req, res, next) {
  if (!ADMIN_EMAILS.includes(req.userEmail)) {
    return res.status(403).json({ error: "Forbidden: Admin only" });
  }
  next();
}

router.use(extractUser);

router.get("/", (req, res) => {
  res.sendFile(path.resolve(__dirname, "../views/index.html"));
});

router.get("/sheet", (req, res) => {
  res.sendFile(path.resolve(__dirname, "../views/sheet.html"));
});

router.get("/setup", (req, res) => {
  res.sendFile(path.resolve(__dirname, "../views/setup.html"));
});

router.get("/docs", (req, res) => {
  res.sendFile(path.resolve(__dirname, "../views/docs.html"));
});

router.get("/status", (req, res) => {
  res.sendFile(path.resolve(__dirname, "../views/status.html"));
});

router.get("/health", (req, res) => {
  res.json({ ok: true });
});

router.get("/api/config", (req, res) => {
  res.json({
    hasGoogleSheet: Boolean(env.googleSheetCsvUrl),
  });
});

router.get("/api/env", (req, res) => {
  try {
    const values = readEnv();
    res.json({ ok: true, values });
  } catch (error) {
    return res.status(500).json({ error: error.message || "failed_to_read_env" });
  }
});

router.put("/api/env", (req, res) => {
  try {
    const values = req.body || {};
    writeEnv(values);
    env.reload();
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message || "failed_to_write_env" });
  }
});

// --- User Identity API ---
router.get("/api/me", (req, res) => {
  const email = req.headers['cf-access-authenticated-user-email'];
  const jwt = req.headers['cf-access-jwt-assertion'];
  
  let name = null;
  if (jwt) {
    try {
      const payloadBase64 = jwt.split('.')[1];
      const payloadStr = Buffer.from(payloadBase64, 'base64').toString('utf8');
      const payload = JSON.parse(payloadStr);
      name = payload.name || payload.common_name;
    } catch (e) {
      console.error("Failed to parse CF JWT", e);
    }
  }

  if (email) {
    res.json({ ok: true, user: { email, name: name || email.split('@')[0] } });
  } else {
    // Local dev fallback
    res.json({ ok: true, user: { email: 'dev@localhost', name: 'Local Admin' } });
  }
});

// --- Team Auth Middleware ---
function requireTeamAuth(req, res, next) {
  const teamId = req.params.id || req.query.teamId || req.body.teamId;
  if (!teamId) return res.status(400).json({ error: "Team ID is required" });
  
  const team = teamService.getTeamById(teamId);
  if (!team) return res.status(404).json({ error: "Team not found" });

  const isOwner = team.owner === req.userEmail;
  const isMember = team.members && team.members.includes(req.userEmail);
  const isAdmin = ADMIN_EMAILS.includes(req.userEmail);
  const isLegacyPublic = !team.owner && !team.password;

  if (!isOwner && !isMember && !isAdmin && !isLegacyPublic) {
    if (team.password && team.password !== req.headers['x-team-password']) {
      return res.status(401).json({ error: "Unauthorized: Incorrect Team Password", isLocked: true });
    }
    if (!team.password) {
      return res.status(403).json({ error: "Forbidden: You don't have access to this team" });
    }
  }
  
  req.team = team;
  next();
}

// --- Teams API ---
router.get("/api/teams", (req, res) => {
  const isAdmin = ADMIN_EMAILS.includes(req.userEmail);
  const allTeams = teamService.getAllTeams();
  
  const publicTeams = [];
  for (const t of allTeams) {
    const isOwner = t.owner === req.userEmail;
    const isMember = t.members && t.members.includes(req.userEmail);
    const hasAclAccess = isAdmin || isOwner || isMember;
    const isLegacyPublic = !t.owner && !t.password;
    
    // Hide strictly private teams (no password, no access)
    if (!hasAclAccess && !isLegacyPublic && !t.password) {
      continue;
    }
    
    publicTeams.push({
      id: t.id,
      name: t.name,
      isLocked: (hasAclAccess || isLegacyPublic) ? false : !!t.password,
      hasSheet: !!t.googleSheetCsvUrl,
      owner: t.owner
    });
  }
  res.json({ ok: true, teams: publicTeams, isAdmin });
});

router.post("/api/teams", (req, res) => {
  const { name, lineAccessToken, lineGroupId, googleSheetCsvUrl, password } = req.body || {};
  if (!name) return res.status(400).json({ error: "Name is required" });
  const team = teamService.createTeam(name, lineAccessToken, lineGroupId, googleSheetCsvUrl, password, req.userEmail);
  res.json({ ok: true, team: { id: team.id, name: team.name, isLocked: false, owner: team.owner } });
});

router.get("/api/teams/:id", requireTeamAuth, (req, res) => {
  // Now authenticated, return full config
  res.json({ ok: true, team: req.team });
});

router.put("/api/teams/:id", requireTeamAuth, (req, res) => {
  const team = teamService.updateTeam(req.params.id, req.body || {});
  res.json({ ok: true, team: { id: team.id, name: team.name, isLocked: !!team.password } });
});

router.delete("/api/teams/:id", requireTeamAuth, (req, res) => {
  try {
    const success = teamService.deleteTeam(req.params.id);
    if (!success) return res.status(404).json({ error: "Team not found" });
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// --- Notify & Sheet API ---
router.get("/api/sheet-rows", requireTeamAuth, async (req, res) => {
  try {
    const rows = await fetchHomeworkRows(req.team.googleSheetCsvUrl, env.lineRequestTimeoutMs);
    return res.json({ ok: true, rows });
  } catch (error) {
    return res.status(400).json({
      error: error.message || "failed_to_fetch_sheet_rows",
    });
  }
});

router.post("/notify", requireTeamAuth, async (req, res) => {
  const payload = req.body || {};
  const message = buildHomeworkMessage(payload);

  try {
    await pushTextMessage(message, req.team.lineGroupId, req.team.lineAccessToken, env.lineRequestTimeoutMs);
    auditService.logAction({ userEmail: req.userEmail, action: 'send_manual', teamId: req.team.id, status: 'success' });
    return res.json({ ok: true });
  } catch (error) {
    const status = error.response?.status || 502;
    const errorMessage = error.response?.data || error.message || "line_request_failed";
    auditService.logAction({ userEmail: req.userEmail, action: 'send_manual', teamId: req.team.id, status: 'error', details: errorMessage });
    return res.status(status).json({ error: errorMessage });
  }
});
router.post("/notify-row", requireTeamAuth, async (req, res) => {
  const row = req.body || {};
  const message = buildHomeworkMessage({
    subject: row.subject,
    title: row.title,
    detail: row.detail,
    due: row.due || row.date,
  });

  try {
    await pushTextMessage(message, req.team.lineGroupId, req.team.lineAccessToken, env.lineRequestTimeoutMs);
    auditService.logAction({ userEmail: req.userEmail, action: 'send_row', teamId: req.team.id, status: 'success' });
    return res.json({ ok: true });
  } catch (error) {
    const status = error.response?.status || 502;
    const errorMessage = error.response?.data || error.message || "line_request_failed";
    auditService.logAction({ userEmail: req.userEmail, action: 'send_row', teamId: req.team.id, status: 'error', details: errorMessage });
    return res.status(status).json({ error: errorMessage });
  }
});

// --- Admin API ---
router.get("/admin", requireAdmin, (req, res) => {
  res.sendFile(path.resolve(__dirname, "../views/admin.html"));
});

router.get("/api/admin/logs", requireAdmin, (req, res) => {
  res.json({ ok: true, logs: auditService.readAuditLogs() });
});

router.get("/api/admin/teams", requireAdmin, (req, res) => {
  res.json({ ok: true, teams: teamService.getAllTeams() });
});

module.exports = router;
