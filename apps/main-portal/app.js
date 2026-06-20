const express = require("express");
const path = require("path");
const notifyRoutes = require("./routes/notifyRoutes");

function createApp() {
  const app = express();

  app.use(express.json());
  app.use("/assets", express.static(path.resolve(__dirname, "views", "assets")));
  app.use(notifyRoutes);

  return app;
}

module.exports = createApp;
