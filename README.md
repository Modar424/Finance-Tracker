# Ledgerly – Personal Finance Tracker

Track income, expenses and financial summaries.

- `backend/` – Node.js, Express, MySQL (mysql2), JWT in httpOnly cookies with refresh-token rotation
- `frontend/` – React (Vite), React Router, Axios, TanStack Query, Tailwind CSS, Recharts

## Run locally
1. **Database:** `mysql -u root -p < backend/schema.sql`
2. **Backend:** `cd backend && cp .env.example .env` (edit values) `&& npm install && npm run dev`
3. **Frontend:** `cd frontend && cp .env.example .env && npm install && npm run dev`
4. Open http://localhost:5173 (use `localhost`, not `127.0.0.1`), register, and start adding transactions.

See `backend/README.md` and `frontend/README.md` for details.
