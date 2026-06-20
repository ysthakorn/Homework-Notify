/**
 * push-portal/services/pushService.js
 * Handles sending Web Push notifications to subscribers via the web-push library.
 */

const subscriptionService = require("./subscriptionService");

/**
 * Broadcast a push notification to all matching subscribers.
 * @param {object} webpush - Configured web-push instance
 * @param {object} options
 * @param {string} options.title
 * @param {string} [options.body]
 * @param {string} [options.url]
 * @param {string} [options.teamId] - If provided, only sends to subscribers of that team
 * @returns {Promise<{sent: number, failed: number, total: number}>}
 */
async function broadcast(webpush, { title, body = "", url = "/", teamId = null }) {
  const targets = subscriptionService.getSubscribersForTeam(teamId);

  if (targets.length === 0) {
    return { sent: 0, failed: 0, total: 0 };
  }

  const payload = JSON.stringify({
    title,
    body,
    url,
    teamId,
    timestamp: new Date().toISOString(),
  });

  let sent = 0;
  let failed = 0;
  const deadEndpoints = [];

  const results = await Promise.allSettled(
    targets.map((sub) => webpush.sendNotification(sub, payload))
  );

  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      sent++;
    } else {
      failed++;
      const code = result.reason?.statusCode;
      // 404/410 = subscription no longer valid
      if (code === 404 || code === 410) {
        deadEndpoints.push(targets[i].endpoint);
      }
    }
  });

  subscriptionService.removeDeadSubscriptions(deadEndpoints);

  return { sent, failed, total: subscriptionService.getCount() };
}

module.exports = { broadcast };
