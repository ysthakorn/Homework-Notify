const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

dotenv.config();

const ENV_PATH = path.resolve(process.cwd(), ".env");

const env = {
  lineAccessToken: process.env.LINE_ACCESS_TOKEN || "YOUR_TOKEN_HERE",
  lineGroupId: process.env.LINE_GROUP_ID || "YOUR_GROUP_ID_HERE",
  port: Number(process.env.PORT || 8080),
  lineRequestTimeoutMs:
    Number(process.env.LINE_REQUEST_TIMEOUT_SEC || 10) * 1000,
  googleSheetCsvUrl: process.env.GOOGLE_SHEET_CSV_URL || "",

  reload() {
    if (fs.existsSync(ENV_PATH)) {
      const parsed = dotenv.parse(fs.readFileSync(ENV_PATH, "utf8"));
      Object.keys(parsed).forEach((key) => {
        process.env[key] = parsed[key];
      });
    }

    this.lineAccessToken = process.env.LINE_ACCESS_TOKEN || "YOUR_TOKEN_HERE";
    this.lineGroupId = process.env.LINE_GROUP_ID || "YOUR_GROUP_ID_HERE";
    this.port = Number(process.env.PORT || 8080);
    this.lineRequestTimeoutMs =
      Number(process.env.LINE_REQUEST_TIMEOUT_SEC || 10) * 1000;
    this.googleSheetCsvUrl = process.env.GOOGLE_SHEET_CSV_URL || "";
  },
};

module.exports = env;
