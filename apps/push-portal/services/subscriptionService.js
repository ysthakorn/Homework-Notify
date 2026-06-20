/**
 * push-portal/services/subscriptionService.js
 * Handles all read/write operations for push subscriptions stored in JSON.
 */

const fs = require("fs");
const path = require("path");

const SUBS_PATH = path.resolve(__dirname, "../../../data/push_subscriptions.json");

function readSubscriptions() {
  if (!fs.existsSync(SUBS_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(SUBS_PATH, "utf8"));
  } catch {
    return [];
  }
}

function writeSubscriptions(subs) {
  fs.writeFileSync(SUBS_PATH, JSON.stringify(subs, null, 2), "utf8");
}

function upsertSubscription(subObject, teamIds = []) {
  const subs = readSubscriptions();
  const idx = subs.findIndex((s) => s.endpoint === subObject.endpoint);
  const entry = {
    ...subObject,
    teamIds: Array.isArray(teamIds) ? teamIds : [],
    subscribedAt: new Date().toISOString(),
  };
  if (idx >= 0) {
    subs[idx] = entry;
  } else {
    subs.push(entry);
  }
  writeSubscriptions(subs);
  return subs.length;
}

function removeSubscription(endpoint) {
  const cleaned = readSubscriptions().filter((s) => s.endpoint !== endpoint);
  writeSubscriptions(cleaned);
}

function removeDeadSubscriptions(deadEndpoints) {
  if (!deadEndpoints.length) return;
  writeSubscriptions(readSubscriptions().filter((s) => !deadEndpoints.includes(s.endpoint)));
}

function getSubscribersForTeam(teamId) {
  return readSubscriptions().filter((s) => {
    if (!teamId) return true;
    if (!s.teamIds || s.teamIds.length === 0) return true;
    return s.teamIds.includes(teamId);
  });
}

function getCount() {
  return readSubscriptions().length;
}

module.exports = {
  readSubscriptions,
  upsertSubscription,
  removeSubscription,
  removeDeadSubscriptions,
  getSubscribersForTeam,
  getCount,
};
