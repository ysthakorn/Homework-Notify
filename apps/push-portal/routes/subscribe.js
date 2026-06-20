/**
 * push-portal/routes/subscribe.js
 * Routes for managing browser push subscriptions.
 */

const express = require("express");
const fs = require("fs");
const path = require("path");
const subscriptionService = require("../services/subscriptionService");

const TEAMS_PATH    = path.resolve(__dirname, "../../../data/teams.json");
const HOMEWORK_PATH = path.resolve(__dirname, "../../../data/homework.json");

const router = express.Router();

// GET /api/vapid-public-key — browser needs this to create a PushSubscription
router.get("/api/vapid-public-key", (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// GET /api/teams — read teams.json directly (no dependency on src/services)
router.get("/api/teams", (req, res) => {
  try {
    const raw = fs.readFileSync(TEAMS_PATH, "utf8");
    const all = JSON.parse(raw);
    const teams = all.map((t) => ({ 
      id: t.id, 
      name: t.name,
      googleFormUrl: t.googleFormUrl || '',
      googleFormEntryId: t.googleFormEntryId || '',
      googleFormSubjectEntryId: t.googleFormSubjectEntryId || ''
    }));
    res.json({ ok: true, teams });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message, teams: [] });
  }
});

// GET /api/teams-with-students — includes student list for the submit form
router.get("/api/teams-with-students", (req, res) => {
  try {
    const raw = fs.readFileSync(TEAMS_PATH, "utf8");
    const all = JSON.parse(raw);
    const teams = all.map((t) => ({
      id: t.id,
      name: t.name,
      googleFormUrl: t.googleFormUrl || '',
      googleFormEntryId: t.googleFormEntryId || '',
      googleFormSubjectEntryId: t.googleFormSubjectEntryId || '',
      students: (t.students || []).map((s) =>
        typeof s === "string" ? { name: s, email: "" } : s
      ),
    }));
    res.json({ ok: true, teams });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message, teams: [] });
  }
});

// GET /api/homework?teamId=xxx — active homework for a team
router.get("/api/homework", (req, res) => {
  const { teamId } = req.query;
  if (!teamId) return res.status(400).json({ error: "teamId required" });
  try {
    const raw = fs.readFileSync(HOMEWORK_PATH, "utf8");
    const all = JSON.parse(raw);
    const hw = all
      .filter((h) => h.teamId === teamId && (!h.status || h.status === "active"))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ ok: true, homework: hw });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message, homework: [] });
  }
});

// GET /api/subscribers/count — total number of active subscriptions
router.get("/api/subscribers/count", (req, res) => {
  res.json({ ok: true, count: subscriptionService.getCount() });
});

// POST /api/subscribe — register (or update) a push subscription
router.post("/api/subscribe", (req, res) => {
  const { subscription, teamIds } = req.body || {};
  // Accept both wrapped `{ subscription, teamIds }` and raw subscription object
  const sub = subscription || req.body;

  if (!sub || !sub.endpoint) {
    return res.status(400).json({ error: "Invalid subscription object" });
  }

  const count = subscriptionService.upsertSubscription(sub, teamIds || []);
  res.json({ ok: true, count });
});

// DELETE /api/subscribe — unregister a subscription by endpoint
router.delete("/api/subscribe", (req, res) => {
  const { endpoint } = req.body || {};
  if (!endpoint) return res.status(400).json({ error: "endpoint is required" });
  subscriptionService.removeSubscription(endpoint);
  res.json({ ok: true });
});

module.exports = router;
