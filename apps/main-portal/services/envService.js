const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const ENV_PATH = path.resolve(process.cwd(), ".env");

const ENV_KEYS = [
  "LINE_ACCESS_TOKEN",
  "LINE_GROUP_ID",
  "PORT",
  "LINE_REQUEST_TIMEOUT_SEC",
  "GOOGLE_SHEET_CSV_URL",
];

function readEnv() {
  const result = {};
  ENV_KEYS.forEach((key) => {
    result[key] = "";
  });

  if (fs.existsSync(ENV_PATH)) {
    const parsed = dotenv.parse(fs.readFileSync(ENV_PATH, "utf8"));
    ENV_KEYS.forEach((key) => {
      if (parsed[key] !== undefined) {
        result[key] = parsed[key];
      }
    });
  }

  return result;
}

function formatValue(value) {
  if (!value) {
    return "";
  }
  if (/[\s#"'\\]/.test(value)) {
    return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return value;
}

function writeEnv(values) {
  let existing = {};
  if (fs.existsSync(ENV_PATH)) {
    existing = dotenv.parse(fs.readFileSync(ENV_PATH, "utf8"));
  }

  ENV_KEYS.forEach((key) => {
    if (values[key] !== undefined) {
      existing[key] = String(values[key]);
    }
  });

  const lines = Object.entries(existing)
    .map(([key, value]) => `${key}=${formatValue(value)}`)
    .join("\n");

  fs.writeFileSync(ENV_PATH, lines + "\n", "utf8");
}

module.exports = { readEnv, writeEnv, ENV_KEYS };
