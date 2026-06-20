const axios = require("axios");
const env = require("../config/env");

const LINE_PUSH_API_URL = "https://api.line.me/v2/bot/message/push";

async function pushTextMessage(messageText, lineGroupId, lineAccessTokens, requestTimeoutMs = 10000) {
  if (!lineGroupId || !lineAccessTokens) {
    throw new Error("Missing LINE Group ID or Access Tokens");
  }

  // Backward compatibility
  let tokens = [];
  if (typeof lineAccessTokens === 'string') {
    tokens = lineAccessTokens.split(',').map(t => ({ token: t.trim(), remark: '' })).filter(x => x.token);
  } else if (Array.isArray(lineAccessTokens)) {
    tokens = lineAccessTokens;
  }

  if (tokens.length === 0) {
    throw new Error("No LINE Access Tokens provided");
  }

  let lastError;

  for (const t of tokens) {
    if (!t.token) continue;
    try {
      const response = await axios.post(
        LINE_PUSH_API_URL,
        {
          to: lineGroupId,
          messages: [{ type: "text", text: messageText }],
        },
        {
          headers: {
            Authorization: `Bearer ${t.token}`,
            "Content-Type": "application/json",
          },
          timeout: requestTimeoutMs,
        }
      );
      return response; // Success, return early
    } catch (error) {
      lastError = error;
      const remarkText = t.remark ? ` (${t.remark})` : '';
      console.warn(`Failed to push text message with token ${t.token.substring(0, 5)}...${remarkText} Trying next token.`);
    }
  }

  throw lastError || new Error("Failed to push message with all provided tokens");
}

async function pushFlexMessage(flexContent, lineGroupId, lineAccessTokens, requestTimeoutMs = 10000) {
  if (!lineGroupId || !lineAccessTokens) {
    throw new Error("Missing LINE Group ID or Access Tokens");
  }

  // Backward compatibility
  let tokens = [];
  if (typeof lineAccessTokens === 'string') {
    tokens = lineAccessTokens.split(',').map(t => ({ token: t.trim(), remark: '' })).filter(x => x.token);
  } else if (Array.isArray(lineAccessTokens)) {
    tokens = lineAccessTokens;
  }

  if (tokens.length === 0) {
    throw new Error("No LINE Access Tokens provided");
  }

  let lastError;

  for (const t of tokens) {
    if (!t.token) continue;
    try {
      const response = await axios.post(
        LINE_PUSH_API_URL,
        {
          to: lineGroupId,
          messages: [flexContent],
        },
        {
          headers: {
            Authorization: `Bearer ${t.token}`,
            "Content-Type": "application/json",
          },
          timeout: requestTimeoutMs,
        }
      );
      return response; // Success, return early
    } catch (error) {
      lastError = error;
      const remarkText = t.remark ? ` (${t.remark})` : '';
      console.warn(`Failed to push flex message with token ${t.token.substring(0, 5)}...${remarkText} Trying next token.`);
    }
  }

  throw lastError || new Error("Failed to push flex message with all provided tokens");
}

module.exports = {
  pushTextMessage,
  pushFlexMessage,
};
