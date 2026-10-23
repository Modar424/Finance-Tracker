# Finance Tracker – Frontend

React 18 (Vite), React Router, Axios, TanStack Query, Tailwind CSS, Recharts.

## Setup
1. Node 18+ required. Start the backend first.
2. `cp .env.example .env` (set `VITE_API_URL` and `VITE_CURRENCY` if needed).
3. `npm install`
4. `npm run dev` → http://localhost:5173 (use `localhost`, not `127.0.0.1`, so cookies stay same-site with the API)
5. Production: `npm run build`, then serve `dist/` from any static host.

## Dark mode
A sun/moon button toggles light and dark themes. The choice is saved in the browser; the first visit follows the system setting.

## Content-Security-Policy (production)
Serve the built files with a header such as:
`default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self' https://your-api.example.com; script-src 'self' 'sha256-<hash of the inline theme script in index.html>'; frame-ancestors 'none'; base-uri 'none'`
