const axios = require("axios");
const env = require("../config/env");

const HEADER_ALIASES = {
  subject: ["subject", "subject_name", "วิชา"],
  title: ["title", "topic", "หัวข้อ", "งาน"],
  detail: ["detail", "description", "รายละเอียด"],
  due: ["due", "date", "deadline", "กำหนดส่ง", "วันที่"],
};

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function splitCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
}

function parseCsvText(csvText) {
  const lines = String(csvText || "")
    .replace(/\r/g, "")
    .split("\n")
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return [];
  }

  const rawHeaders = splitCsvLine(lines[0]);
  const headers = rawHeaders.map(normalizeHeader);

  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const values = splitCsvLine(lines[i]);
    const row = {};

    headers.forEach((header, idx) => {
      row[header] = values[idx] || "";
    });

    rows.push(row);
  }

  return rows;
}

function pickField(row, aliases) {
  for (const key of aliases) {
    const value = row[normalizeHeader(key)];
    if (value) {
      return value;
    }
  }

  return "";
}

function mapToHomeworkRow(row, index) {
  return {
    rowId: index + 1,
    subject: pickField(row, HEADER_ALIASES.subject),
    title: pickField(row, HEADER_ALIASES.title),
    detail: pickField(row, HEADER_ALIASES.detail),
    due: pickField(row, HEADER_ALIASES.due),
  };
}

async function fetchHomeworkRows(googleSheetCsvUrl, requestTimeoutMs = 10000) {
  if (!googleSheetCsvUrl) {
    throw new Error("Google Sheet CSV URL is not configured for this team.");
  }

  const response = await axios.get(googleSheetCsvUrl, {
    timeout: requestTimeoutMs,
  });

  const rawRows = parseCsvText(response.data);
  return rawRows.map(mapToHomeworkRow).filter((row) => row.subject || row.detail || row.due || row.title);
}

module.exports = {
  fetchHomeworkRows,
};
