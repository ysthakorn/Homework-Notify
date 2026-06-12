const axios = require("axios");
const env = require("../config/env");

const LINE_PUSH_API_URL = "https://api.line.me/v2/bot/message/push";

async function pushTextMessage(messageText, lineGroupId, lineAccessToken, requestTimeoutMs = 10000) {
  if (!lineGroupId || !lineAccessToken) {
    throw new Error("Missing LINE Group ID or Access Token");
  }

  return axios.post(
    LINE_PUSH_API_URL,
    {
      to: lineGroupId,
      messages: [{ type: "text", text: messageText }],
    },
    {
      headers: {
        Authorization: `Bearer ${lineAccessToken}`,
        "Content-Type": "application/json",
      },
      timeout: requestTimeoutMs,
    }
  );
}

module.exports = {
  pushTextMessage,
};
