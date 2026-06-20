process.env.TZ = "Asia/Bangkok";
const express = require('express');
const path = require('path');
const routes = require('./routes');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const PORT = 8081;

app.use(express.json());
app.use('/assets', express.static(path.resolve(__dirname, 'views', 'assets')));

// Shared main assets (for global styles, fonts)
app.use('/main-assets', express.static(path.resolve(__dirname, '../../main-portal/views/assets')));

app.use(routes);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Student Portal is running on port ${PORT}...`);
});
