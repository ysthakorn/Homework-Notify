/**
 * push-portal/routes/pages.js
 * Serves HTML views for the push-portal.
 */

const express = require("express");
const path = require("path");

const router = express.Router();
const VIEWS = path.resolve(__dirname, "../views");

router.get("/", (req, res) => res.sendFile(path.join(VIEWS, "index.html")));
router.get("/document", (req, res) => res.sendFile(path.join(VIEWS, "document.html")));
router.get("/homework", (req, res) => res.sendFile(path.join(VIEWS, "homework.html")));

module.exports = router;
