const express = require("express");
const path = require("path");
const axios = require("axios");

const { buildHomeworkMessage, buildHomeworkFlexMessage } = require("../services/messageBuilder");
const { pushTextMessage, pushFlexMessage } = require("../services/lineClient");

const { readEnv, writeEnv } = require("../services/envService");
const env = require("../config/env");
const teamService = require("../services/teamService");
const auditService = require("../services/auditService");

// --- Push Portal Integration (fire-and-forget) ---
function sendPushNotification(payload) {
  const pushPortalUrl = process.env.PUSH_PORTAL_URL || "http://localhost:8082";
  const pushSecret = process.env.PUSH_SECRET || "";
  axios.post(`${pushPortalUrl}/api/push/send`, payload, {
    headers: { "X-Push-Secret": pushSecret, "Content-Type": "application/json" },
    timeout: 5000,
  }).catch((err) => {
    console.warn("[Push Portal] Failed to send push:", err.message);
  });
}

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

  if (!isOwner && !isMember && !isAdmin) {
    if (team.apiKey && team.apiKey !== req.headers['x-api-key']) {
      return res.status(401).json({ error: "Unauthorized: Incorrect API Key" });
    }
    if (!team.apiKey) {
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
    
    // Strict Privacy: Only show teams the user explicitly has access to
    if (!hasAclAccess) {
      continue;
    }
    
    publicTeams.push({
      id: t.id,
      name: t.name,
      isLocked: false, // Always false because they already have ACL access
      hasSheet: !!t.googleSheetId,
      owner: t.owner
    });
  }
  
  if (publicTeams.length === 0) {
    let name = '';
    const jwt = req.headers['cf-access-jwt-assertion'];
    if (jwt) {
      try {
        const payloadBase64 = jwt.split('.')[1];
        const payloadStr = Buffer.from(payloadBase64, 'base64').toString('utf8');
        const payload = JSON.parse(payloadStr);
        name = payload.name || payload.common_name;
      } catch (e) {}
    }
    const displayName = name || (req.userEmail ? req.userEmail.split('@')[0] : 'My');
    const newTeam = teamService.createTeam(`${displayName}'s Team`, "", "", "", "", req.userEmail);
    publicTeams.push({
      id: newTeam.id,
      name: newTeam.name,
      isLocked: false,
      hasSheet: false,
      owner: newTeam.owner
    });
  }
  
  res.json({ ok: true, teams: publicTeams, isAdmin });
});

router.post("/api/teams", (req, res) => {
  const { name, lineAccessToken, lineGroupId, googleSheetId, apiKey } = req.body || {};
  if (!name) return res.status(400).json({ error: "Name is required" });
  const team = teamService.createTeam(name, lineAccessToken, lineGroupId, googleSheetId, apiKey, req.userEmail);
  res.json({ ok: true, team: { id: team.id, name: team.name, isLocked: false, owner: team.owner } });
});

router.get("/api/teams/:id", requireTeamAuth, (req, res) => {
  // Now authenticated, return full config
  res.json({ ok: true, team: req.team });
});

router.put("/api/teams/:id", requireTeamAuth, (req, res) => {
  let updateData = req.body || {};
  if (updateData.regenerateApiKey) {
    updateData.apiKey = `hw_${require('crypto').randomBytes(16).toString('hex')}`;
    delete updateData.regenerateApiKey;
  }
  const team = teamService.updateTeam(req.params.id, updateData);
  res.json({ ok: true, team: { id: team.id, name: team.name, apiKey: team.apiKey } });
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


router.post("/notify", requireTeamAuth, async (req, res) => {
  const payload = req.body || {};

  let submitUrl = null;
  try {
    if (req.team.googleFormUrl && req.team.googleFormEntryId && payload.hwId) {
      // Use Flex Message if Google Form is configured
      const baseUrl = req.team.googleFormUrl;
      const entryId = req.team.googleFormEntryId;
      const title = encodeURIComponent(payload.title || "");
      const subjectEntryId = req.team.googleFormSubjectEntryId;
      const subject = encodeURIComponent(payload.subject || "");
      
      const separator = baseUrl.includes('?') ? '&' : '?';
      submitUrl = `${baseUrl}${separator}usp=pp_url&${entryId}=${title}`;
      if (subjectEntryId && subject) {
        submitUrl += `&${subjectEntryId}=${subject}`;
      }
      
      const flexMsg = buildHomeworkFlexMessage(payload, submitUrl);
      await pushFlexMessage(flexMsg, req.team.lineGroupId, req.team.lineAccessTokens, env.lineRequestTimeoutMs);
    } else {
      // Fallback to Text Message
      const message = buildHomeworkMessage(payload);
      await pushTextMessage(message, req.team.lineGroupId, req.team.lineAccessTokens, env.lineRequestTimeoutMs);
    }
    
    auditService.logAction({ userEmail: req.userEmail, action: 'send_manual', teamId: req.team.id, status: 'success' });
    // Also send Web Push (non-blocking)
    sendPushNotification({
      title: `การบ้านใหม่: ${payload.subject || ''} - ${payload.title || ''}`,
      body: payload.detail ? payload.detail.substring(0, 100) : `กำหนดส่ง: ${payload.due || '-'}`,
      url: submitUrl || process.env.APP_BASE_URL || '/',
      teamId: req.team.id,
    });
    return res.json({ ok: true });
  } catch (error) {
    const status = error.response?.status || 502;
    const errorMessage = error.response?.data || error.message || "line_request_failed";
    auditService.logAction({ userEmail: req.userEmail, action: 'send_manual', teamId: req.team.id, status: 'error', details: errorMessage });
    // Still try Push Portal even if LINE fails
    sendPushNotification({
      title: `การบ้านใหม่: ${payload.subject || ''} - ${payload.title || ''}`,
      body: payload.detail ? payload.detail.substring(0, 100) : `กำหนดส่ง: ${payload.due || '-'}`,
      url: submitUrl || process.env.APP_BASE_URL || '/',
      teamId: payload.teamId || '',
    });
    // Return 200 OK so the UI doesn't show Bad Gateway, because Web Push is still active.
    return res.json({ ok: true, lineError: errorMessage });
  }
});

// --- Redirect to Google Form ---
router.get("/go/:hwId", (req, res) => {
  const hwId = req.params.hwId;
  const hw = homeworkService.getHomeworkById(hwId);
  if (!hw) return res.status(404).send("Homework not found");
  
  const team = teamService.getTeamById(hw.teamId);
  if (!team || !team.googleFormUrl || !team.googleFormEntryId) {
    return res.status(404).send("Google Form is not configured for this team");
  }

  const baseUrl = team.googleFormUrl;
  const entryId = team.googleFormEntryId;
  const title = encodeURIComponent(hw.title);
  const subjectEntryId = team.googleFormSubjectEntryId;
  const subject = encodeURIComponent(hw.subject || "");

  // e.g. https://docs.google.com/forms/.../viewform?entry.123456=My+Homework
  const separator = baseUrl.includes('?') ? '&' : '?';
  let redirectUrl = `${baseUrl}${separator}usp=pp_url&${entryId}=${title}`;
  if (subjectEntryId && subject) {
    redirectUrl += `&${subjectEntryId}=${subject}`;
  }

  res.redirect(redirectUrl);
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

// --- Homework Routes ---
const homeworkService = require("../services/homeworkService");
const formSyncService = require("../services/formSyncService");
const { buildSubmissionSummary } = require("../services/messageBuilder");

router.get("/homework", (req, res) => {
  res.sendFile(path.resolve(__dirname, "../views/homework.html"));
});

// List homework for a team
router.get("/api/homework", requireTeamAuth, (req, res) => {
  const homework = homeworkService.getHomeworkByTeam(req.team.id);
  res.json({ ok: true, homework });
});

// Sync homework from Google Form
router.post("/api/homework/sync", requireTeamAuth, async (req, res) => {
  try {
    const syncedCount = await formSyncService.syncTeamHomeworks(req.team.id);
    auditService.logAction({
      userEmail: req.userEmail,
      action: "sync_form",
      teamId: req.team.id,
      status: "success",
      details: `Synced ${syncedCount} submissions`,
    });
    res.json({ ok: true, syncedCount });
  } catch (error) {
    auditService.logAction({
      userEmail: req.userEmail,
      action: "sync_form",
      teamId: req.team.id,
      status: "error",
      details: error.message,
    });
    res.status(400).json({ error: error.message });
  }
});

// Create homework
router.post("/api/homework", requireTeamAuth, (req, res) => {
  const { subject, title, detail, due } = req.body || {};
  if (!subject || !title) {
    return res.status(400).json({ error: "subject and title are required" });
  }

  const hw = homeworkService.createHomework(req.team.id, {
    subject,
    title,
    detail: detail || "",
    due: due || "",
    createdBy: req.userEmail,
  });

  auditService.logAction({
    userEmail: req.userEmail,
    action: "create_homework",
    teamId: req.team.id,
    status: "success",
    details: `${subject} - ${title}`,
  });

  res.json({ ok: true, homework: hw });
});

// Update homework
router.put("/api/homework/:hwId", requireTeamAuth, (req, res) => {
  const hw = homeworkService.updateHomework(req.params.hwId, req.body || {});
  if (!hw) return res.status(404).json({ error: "Homework not found" });
  res.json({ ok: true, homework: hw });
});

// Delete homework
router.delete("/api/homework/:hwId", requireTeamAuth, (req, res) => {
  const success = homeworkService.deleteHomework(req.params.hwId);
  if (!success) return res.status(404).json({ error: "Homework not found" });
  auditService.logAction({
    userEmail: req.userEmail,
    action: "delete_homework",
    teamId: req.team.id,
    status: "success",
    details: req.params.hwId,
  });
  res.json({ ok: true });
});

// --- Approval System ---

// List pending homework for a team
router.get("/api/homework/pending", requireTeamAuth, (req, res) => {
  const pending = homeworkService.getPendingByTeam(req.team.id);
  res.json({ ok: true, homework: pending });
});

// Approve a pending homework
router.post("/api/homework/:hwId/approve", requireTeamAuth, async (req, res) => {
  const hw = homeworkService.approveHomework(req.params.hwId);
  if (!hw) return res.status(404).json({ error: "Pending homework not found" });

  auditService.logAction({
    userEmail: req.userEmail,
    action: "approve_homework",
    teamId: req.team.id,
    status: "success",
    details: `${hw.subject} - ${hw.title}`,
  });

  // Send LINE notification on approval
  try {
    let submitUrl = null;
    if (req.team.googleFormUrl && req.team.googleFormEntryId) {
      const baseUrl = req.team.googleFormUrl;
      const entryId = req.team.googleFormEntryId;
      const title = encodeURIComponent(hw.title || "");
      const subjectEntryId = req.team.googleFormSubjectEntryId;
      const subject = encodeURIComponent(hw.subject || "");
      const separator = baseUrl.includes('?') ? '&' : '?';
      let submitUrl = `${baseUrl}${separator}usp=pp_url&${entryId}=${title}`;
      if (subjectEntryId && subject) {
        submitUrl += `&${subjectEntryId}=${subject}`;
      }
      const flexMsg = buildHomeworkFlexMessage(hw, submitUrl);
      await pushFlexMessage(flexMsg, req.team.lineGroupId, req.team.lineAccessTokens, env.lineRequestTimeoutMs);
    } else {
      const message = buildHomeworkMessage(hw);
      await pushTextMessage(message, req.team.lineGroupId, req.team.lineAccessTokens, env.lineRequestTimeoutMs);
    }
  } catch (lineErr) {
    console.error("LINE notification after approve failed:", lineErr.message);
  }

  let pushUrl = process.env.APP_BASE_URL || '/';
  if (req.team && req.team.googleFormUrl && req.team.googleFormEntryId) {
    const baseUrl = req.team.googleFormUrl;
    const entryId = req.team.googleFormEntryId;
    const title = encodeURIComponent(hw.title || "");
    const subjectEntryId = req.team.googleFormSubjectEntryId;
    const subject = encodeURIComponent(hw.subject || "");
    const separator = baseUrl.includes('?') ? '&' : '?';
    pushUrl = `${baseUrl}${separator}usp=pp_url&${entryId}=${title}`;
    if (subjectEntryId && subject) {
      pushUrl += `&${subjectEntryId}=${subject}`;
    }
  }

  // Also send Web Push on approval (non-blocking)
  sendPushNotification({
    title: `การบ้านใหม่ (อนุมัติแล้ว): ${hw.subject || ''} - ${hw.title || ''}`,
    body: hw.detail ? hw.detail.substring(0, 100) : `กำหนดส่ง: ${hw.due || '-'}`,
    url: pushUrl,
    teamId: hw.teamId || '',
  });

  res.json({ ok: true, homework: hw });
});

// Reject a pending homework
router.post("/api/homework/:hwId/reject", requireTeamAuth, (req, res) => {
  const { reason } = req.body || {};
  const hw = homeworkService.rejectHomework(req.params.hwId, reason);
  if (!hw) return res.status(404).json({ error: "Pending homework not found" });

  auditService.logAction({
    userEmail: req.userEmail,
    action: "reject_homework",
    teamId: req.team.id,
    status: "success",
    details: `${hw.subject} - ${hw.title} (reason: ${reason || 'none'})`,
  });

  res.json({ ok: true, homework: hw });
});

// Mark student submission
router.post("/api/homework/:hwId/submit", requireTeamAuth, (req, res) => {
  const { studentName } = req.body || {};
  if (!studentName) return res.status(400).json({ error: "studentName is required" });

  const hw = homeworkService.markSubmission(req.params.hwId, studentName, req.userEmail);
  if (!hw) return res.status(404).json({ error: "Homework not found" });
  res.json({ ok: true, homework: hw });
});

// Unmark student submission
router.delete("/api/homework/:hwId/submit", requireTeamAuth, (req, res) => {
  const { studentName } = req.body || {};
  if (!studentName) return res.status(400).json({ error: "studentName is required" });

  const hw = homeworkService.unmarkSubmission(req.params.hwId, studentName);
  if (!hw) return res.status(404).json({ error: "Homework not found" });
  res.json({ ok: true, homework: hw });
});

// Batch update submissions (set all at once)
router.put("/api/homework/:hwId/submissions", requireTeamAuth, (req, res) => {
  const { submitted } = req.body || {};
  if (!Array.isArray(submitted)) return res.status(400).json({ error: "submitted array is required" });

  const hw = homeworkService.getHomeworkById(req.params.hwId);
  if (!hw) return res.status(404).json({ error: "Homework not found" });

  // Get current students from team
  const students = req.team.students || [];

  // Reset all submissions then mark the submitted ones
  hw.submissions = {};
  for (const name of submitted) {
    hw.submissions[name] = {
      submittedAt: new Date().toISOString(),
      submittedBy: req.userEmail,
    };
  }

  const updated = homeworkService.updateHomework(req.params.hwId, { submissions: hw.submissions });
  res.json({ ok: true, homework: updated });
});

// Send submission summary to LINE
router.post("/api/homework/:hwId/notify-summary", requireTeamAuth, async (req, res) => {
  const hw = homeworkService.getHomeworkById(req.params.hwId);
  if (!hw) return res.status(404).json({ error: "Homework not found" });

  const students = req.team.students || [];
  const message = buildSubmissionSummary(hw, students);

  try {
    await pushTextMessage(message, req.team.lineGroupId, req.team.lineAccessTokens, env.lineRequestTimeoutMs);
    auditService.logAction({
      userEmail: req.userEmail,
      action: "send_summary",
      teamId: req.team.id,
      status: "success",
      details: hw.title,
    });
    return res.json({ ok: true });
  } catch (error) {
    const status = error.response?.status || 502;
    const errorMessage = error.response?.data || error.message || "line_request_failed";
    auditService.logAction({
      userEmail: req.userEmail,
      action: "send_summary",
      teamId: req.team.id,
      status: "error",
      details: errorMessage,
    });
    return res.status(status).json({ error: errorMessage });
  }
});

module.exports = router;
