process.env.TZ = "Asia/Bangkok";
const createApp = require("./app");
const env = require("./config/env");
const { startCodeRedScheduler } = require("./services/codeRedService");

const app = createApp();

app.listen(env.port, "0.0.0.0", () => {
  // eslint-disable-next-line no-console
  console.log(`Server is running on port ${env.port}...`);
  startCodeRedScheduler();
});
