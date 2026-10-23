require('dotenv').config();

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must be set and at least 32 characters long. Copy .env.example to .env.');
  process.exit(1);
}

const app = require('./app');
const db = require('./config/db');

const port = process.env.PORT || 5000;

// Purge expired refresh tokens every 6 hours (instead of on every login).
const purgeTokens = () =>
  db.query('DELETE FROM refresh_tokens WHERE expires_at < UTC_TIMESTAMP()')
    .catch((e) => console.error('Token cleanup failed:', e.message));

db.query('SELECT 1')
  .then(() => {
    app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
    purgeTokens();
    setInterval(purgeTokens, 6 * 60 * 60 * 1000).unref();
  })
  .catch((e) => {
    console.error('Cannot connect to MySQL:', e.message);
    process.exit(1);
  });
