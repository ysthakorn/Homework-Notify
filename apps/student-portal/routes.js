const express = require('express');
const path = require('path');
const teamService = require('../../main-portal/services/teamService');
const homeworkService = require('../../main-portal/services/homeworkService');

const router = express.Router();

router.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'views/index.html'));
});

// Get teams (public info only)
router.get('/api/teams', (req, res) => {
  const teams = teamService.getAllTeams().map(t => ({
    id: t.id,
    name: t.name,
    students: t.students || []
  }));
  res.json({ ok: true, teams });
});

// Submit a new homework request
router.post('/api/request', (req, res) => {
  const { teamId, subject, title, detail, due, studentName } = req.body || {};
  
  if (!teamId || !subject || !title) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const team = teamService.getTeamById(teamId);
  if (!team) {
    return res.status(404).json({ error: "Team not found" });
  }

  const hw = homeworkService.createHomework(teamId, {
    subject,
    title,
    detail: detail || "",
    due: due || "",
    createdBy: studentName,
    status: 'pending_approval'
  });

  res.json({ ok: true, homework: hw });
});

// Get pending requests for a team (to show the student their requests)
router.get('/api/pending', (req, res) => {
  const teamId = req.query.teamId;
  if (!teamId) return res.status(400).json({ error: "teamId required" });
  
  const pending = homeworkService.getPendingByTeam(teamId);
  res.json({ ok: true, homework: pending });
});

module.exports = router;
