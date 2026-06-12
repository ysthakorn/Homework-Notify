const express = require("express");
const path = require("path");

const { buildHomeworkMessage } = require("../services/messageBuilder");
const { pushTextMessage } = require("../services/lineClient");
const { fetchHomeworkRows } = require("../services/sheetService");
const { readEnv, writeEnv } = require("../services/envService");
const env = require("../config/env");

const router = express.Router();

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

router.get("/api/sheet-rows", async (req, res) => {
  try {
    const rows = await fetchHomeworkRows();
    return res.json({ ok: true, rows });
  } catch (error) {
    return res.status(400).json({
      error: error.message || "failed_to_fetch_sheet_rows",
    });
  }
});

router.post("/notify", async (req, res) => {
  const payload = req.body || {};
  const message = buildHomeworkMessage(payload);

  try {
    await pushTextMessage(message);
    return res.json({ ok: true });
  } catch (error) {
    const status = error.response?.status || 502;
    const errorMessage =
      error.response?.data || error.message || "line_request_failed";

    return res.status(status).json({ error: errorMessage });
  }
});

router.post("/notify-row", async (req, res) => {
  const row = req.body || {};
  const message = buildHomeworkMessage({
    subject: row.subject,
    title: row.title,
    detail: row.detail,
    due: row.due || row.date,
  });

  try {
    await pushTextMessage(message);
    return res.json({ ok: true });
  } catch (error) {
    const status = error.response?.status || 502;
    const errorMessage =
      error.response?.data || error.message || "line_request_failed";

    return res.status(status).json({ error: errorMessage });
  }
});

module.exports = router;
