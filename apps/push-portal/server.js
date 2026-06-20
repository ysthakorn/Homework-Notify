/**
 * push-portal/server.js
 * Entry point for the HW Notifier Push Portal.
 * Runs on port 8082 — an independent MicroService for Web Push Notifications.
 */

process.env.TZ = "Asia/Bangkok";

const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const express = require("express");
const webpush = require("web-push");

// Configure VAPID credentials (generated once, stored in .env)
webpush.setVapidDetails(
  process.env.VAPID_EMAIL || "mailto:admin@example.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const app = express();
const PORT = 8082;

// Make webpush available to routes via app.get("webpush")
app.set("webpush", webpush);

// ── Middleware ──
app.use(express.json());

// ── Static assets ──
app.use("/assets", express.static(path.resolve(__dirname, "views/assets")));

// Service Worker must be served from root scope for full-page coverage
app.get("/sw.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript");
  res.setHeader("Service-Worker-Allowed", "/");
  res.sendFile(path.resolve(__dirname, "views/sw.js"));
});

// ── Routes ──
app.use(require("./routes/pages"));
app.use(require("./routes/subscribe"));
app.use(require("./routes/push"));

// ── Start ──
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[push-portal] Running on port ${PORT}`);
});
