/**
 * push-portal/routes/push.js
 * Internal route for broadcasting push notifications.
 * Protected by the PUSH_SECRET header.
 */

const express = require("express");
const pushService = require("../services/pushService");

const PUSH_SECRET = process.env.PUSH_SECRET;

const router = express.Router();

// POST /api/push/send — trigger broadcast to matching subscribers
// Called internally by the Admin Portal (notifyRoutes.js) after LINE send.
router.post("/api/push/send", async (req, res) => {
  const secret = req.headers["x-push-secret"];
  if (PUSH_SECRET && secret !== PUSH_SECRET) {
    return res.status(401).json({ error: "Unauthorized: invalid X-Push-Secret" });
  }

  const { title, body, url, teamId } = req.body || {};
  if (!title) {
    return res.status(400).json({ error: "title is required" });
  }

  // pushService is initialized lazily so that webpush is available at call time
  const webpush = req.app.get("webpush");
  const result = await pushService.broadcast(webpush, { title, body, url, teamId });
  res.json({ ok: true, ...result });
});

module.exports = router;
