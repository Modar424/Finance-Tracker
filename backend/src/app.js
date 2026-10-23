const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const { csrfGuard, jsonOnly } = require('./middleware/requestGuards');

const isProd = process.env.NODE_ENV === 'production';
const origins = (process.env.CORS_ORIGIN || (isProd ? '' : 'http://localhost:5173'))
  .split(',').map((s) => s.trim()).filter(Boolean);

if (isProd && !origins.length) {
  console.error('CORS_ORIGIN must be set in production.');
  process.exit(1);
}

const app = express();
app.set('trust proxy', Number(process.env.TRUST_PROXY) || 0);
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'same-site' },
}));
app.use(compression());
app.use(cors({ origin: origins, credentials: true }));
if (process.env.NODE_ENV !== 'test') app.use(morgan(isProd ? 'combined' : 'dev'));
app.use(cookieParser());
app.use(jsonOnly);
app.use(express.json({ limit: '100kb' }));
app.use(csrfGuard);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/transactions', require('./routes/transactionRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));

app.use((_req, res) => res.status(404).json({ message: 'Not found' }));
app.use((err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON body' });
  if (err.type === 'entity.too.large') return res.status(413).json({ message: 'Request body too large' });
  console.error(err);
  res.status(500).json({ message: 'Something went wrong on the server' });
});

module.exports = app;
