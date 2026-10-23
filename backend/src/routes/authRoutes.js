const router = require('express').Router();
const crypto = require('crypto');
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const db = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');
const { isEmail } = require('../utils/validators');

const ACCESS_MIN = Number(process.env.ACCESS_TOKEN_MINUTES) || 15;
const REFRESH_DAYS = Number(process.env.REFRESH_TOKEN_DAYS) || 7;
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

const sameSite = (process.env.COOKIE_SAMESITE || 'strict').toLowerCase();
const cookieBase = {
  httpOnly: true,
  sameSite,
  secure: process.env.NODE_ENV === 'production' || sameSite === 'none',
};

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const dummyHash = argon2.hash('dummy-password-for-timing');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: Number(process.env.LOGIN_RATE_LIMIT) || 10, skipSuccessfulRequests: true,
  standardHeaders: true, legacyHeaders: false,
  message: { message: 'Too many login attempts. Try again in a few minutes.' },
});
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: Number(process.env.REGISTER_RATE_LIMIT) || 10,
  standardHeaders: true, legacyHeaders: false,
  message: { message: 'Too many sign-ups from this address. Try again later.' },
});

async function issueRefreshToken(userId) {
  const raw = crypto.randomBytes(48).toString('hex');
  await db.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?,?,DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? DAY))',
    [userId, sha256(raw), REFRESH_DAYS]);
  return raw;
}

async function startSession(res, userId) {
  const access = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: `${ACCESS_MIN}m` });
  const refresh = await issueRefreshToken(userId);
  res.cookie('access_token', access, { ...cookieBase, path: '/', maxAge: ACCESS_MIN * 60 * 1000 });
  res.cookie('refresh_token', refresh, { ...cookieBase, path: '/api/auth', maxAge: REFRESH_DAYS * 86400 * 1000 });
}

function clearSession(res) {
  res.clearCookie('access_token', { ...cookieBase, path: '/' });
  res.clearCookie('refresh_token', { ...cookieBase, path: '/api/auth' });
}

router.post('/register', registerLimiter, async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 100)
      return res.status(400).json({ message: 'Name is required (100 characters max)' });
    if (!isEmail(email)) return res.status(400).json({ message: 'Enter a valid email address' });
    if (typeof password !== 'string' || password.length < 8 || password.length > 128)
      return res.status(400).json({ message: 'Password must be 8 to 128 characters' });

    const mail = email.toLowerCase();
    const hash = await argon2.hash(password, { type: argon2.argon2id });
    let result;
    try {
      [result] = await db.query('INSERT INTO users (name, email, password_hash) VALUES (?,?,?)', [name.trim(), mail, hash]);
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Email already registered' });
      throw e;
    }
    await startSession(res, result.insertId);
    res.status(201).json({ user: { id: result.insertId, name: name.trim(), email: mail } });
  } catch (e) { next(e); }
});

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!isEmail(email) || typeof password !== 'string' || password.length > 128)
      return res.status(401).json({ message: 'Incorrect email or password' });

    const [rows] = await db.query(
      `SELECT id, name, email, password_hash,
              (locked_until IS NOT NULL AND locked_until > UTC_TIMESTAMP()) AS locked
       FROM users WHERE email = ?`, [email.toLowerCase()]);
    const u = rows[0];

    if (u?.locked)
      return res.status(429).json({ message: `Account locked after too many failed attempts. Try again in ${LOCK_MINUTES} minutes.` });

    const valid = u
      ? await argon2.verify(u.password_hash, password).catch(() => false)
      : (await argon2.verify(await dummyHash, password).catch(() => false), false);

    if (!valid) {
      if (u) {
        await db.query(
          `UPDATE users SET
             failed_attempts = IF(locked_until IS NOT NULL AND locked_until <= UTC_TIMESTAMP(), 1, failed_attempts + 1),
             locked_until = IF(failed_attempts >= ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MINUTE), locked_until)
           WHERE id = ?`, [MAX_FAILED, LOCK_MINUTES, u.id]);
      }
      return res.status(401).json({ message: 'Incorrect email or password' });
    }

    await db.query('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?', [u.id]);
    await startSession(res, u.id);
    res.json({ user: { id: u.id, name: u.name, email: u.email } });
  } catch (e) { next(e); }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const raw = req.cookies?.refresh_token;
    if (!raw) return res.status(401).json({ message: 'Session expired' });
    const [rows] = await db.query(
      `SELECT id, user_id,
              (expires_at > UTC_TIMESTAMP()) AS valid,
              (revoked_at IS NOT NULL) AS revoked,
              (revoked_at IS NOT NULL AND revoked_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 SECOND)) AS reused
       FROM refresh_tokens WHERE token_hash = ?`, [sha256(raw)]);
    const t = rows[0];
    if (!t) { clearSession(res); return res.status(401).json({ message: 'Session expired' }); }
    if (t.revoked) {
      // A rotated token presented again after the grace period means it was likely stolen: revoke everything.
      if (t.reused) await db.query('UPDATE refresh_tokens SET revoked_at = UTC_TIMESTAMP() WHERE user_id = ? AND revoked_at IS NULL', [t.user_id]);
      clearSession(res);
      return res.status(401).json({ message: 'Session expired' });
    }
    if (!t.valid) { clearSession(res); return res.status(401).json({ message: 'Session expired' }); }

    await db.query('UPDATE refresh_tokens SET revoked_at = UTC_TIMESTAMP() WHERE id = ?', [t.id]);
    await startSession(res, t.user_id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post('/logout', async (req, res, next) => {
  try {
    const raw = req.cookies?.refresh_token;
    if (raw) await db.query('UPDATE refresh_tokens SET revoked_at = UTC_TIMESTAMP() WHERE token_hash = ? AND revoked_at IS NULL', [sha256(raw)]);
    clearSession(res);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT id, name, email FROM users WHERE id = ?', [req.user.id]);
    if (!rows[0]) return res.status(401).json({ message: 'Session expired' });
    res.json({ user: rows[0] });
  } catch (e) { next(e); }
});

module.exports = router;
