# Finance Tracker – Backend

Node.js + Express + MySQL (mysql2). Auth uses short-lived JWT access tokens and rotating refresh tokens, both in httpOnly cookies.

## Setup
1. Install MySQL 8+ and Node 18+.
2. Create the schema: `mysql -u root -p < schema.sql`
3. `cp .env.example .env`, fill in DB credentials and a `JWT_SECRET` of 32+ random characters.
4. `npm install`
5. `npm run dev` (or `npm start`). API: http://localhost:5000
6. `npm test` runs unit tests.

## Security model
- Access token: 15 min, httpOnly cookie. Refresh token: 7 days, httpOnly cookie scoped to `/api/auth`, stored hashed in `refresh_tokens`, rotated on every refresh, revoked on logout. Reuse of a rotated token (after a 30 second grace period for slow networks) revokes all sessions of that user.
- API responses carry a locked-down Content-Security-Policy (`default-src 'none'`). Transaction dates must fall between 2000-01-01 and one year ahead.
- Passwords hashed with argon2id.
- Login: 10 attempts / 15 min per IP, and the account locks for 15 minutes after 5 failed attempts.
- CSRF: SameSite cookies plus a required `X-Requested-With` header on state-changing requests; JSON-only bodies.
- Set `TRUST_PROXY=1` behind Nginx/Cloudflare/Heroku so rate limiting sees the real client IP.
- Frontend and API must share a site (e.g. `app.example.com` and `api.example.com`) with `COOKIE_SAMESITE=strict` or `lax`. For fully cross-site hosting use `COOKIE_SAMESITE=none` (HTTPS required).

## Endpoints
| Method | Path | Description |
|---|---|---|
| POST | /api/auth/register | Create account and start session |
| POST | /api/auth/login | Log in |
| POST | /api/auth/refresh | Rotate refresh token, issue new access token |
| POST | /api/auth/logout | Revoke refresh token and clear cookies |
| GET | /api/auth/me | Current user |
| GET | /api/transactions | List: `type, category, from, to, search, page, limit` |
| POST | /api/transactions | Create |
| PUT | /api/transactions/:id | Update |
| DELETE | /api/transactions/:id | Delete |
| GET | /api/dashboard/summary?today=YYYY-MM-DD | Totals, 12-month trend, category split, recent |

## Tests
`npm test` runs unit and integration tests (vitest + supertest). Integration tests need MySQL credentials in `.env`; they create and reset their own database named `finance_tracker_test`.

## Maintenance
Expired refresh tokens are purged by a background job (every 6 hours) started in `server.js`.
