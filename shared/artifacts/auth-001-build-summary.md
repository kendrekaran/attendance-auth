# Attendance Auth — Build Summary

## 1. What Was Built

Complete full-stack attendance authentication system at `/Users/karankendre/attendance-auth/`.

### Backend (`server/`)

| File | Purpose |
|------|---------|
| `server/index.ts` | Express app entry point, middleware setup, route mounting |
| `server/db.ts` | SQLite setup via better-sqlite3 — creates `users`, `attendance`, `refresh_tokens` tables |
| `server/middleware/auth.ts` | JWT Bearer token verification middleware |
| `server/middleware/rbac.ts` | Role-check middleware (`requiresRole('admin' \| 'employee')`) |
| `server/routes/auth.ts` | Register, login, refresh, logout endpoints |
| `server/routes/users.ts` | GET/PUT `/api/users/me`, GET `/api/users/all` (admin) |
| `server/routes/attendance.ts` | Check-in, check-out, my attendance, all attendance (admin) |

### Frontend (`src/`)

| File | Purpose |
|------|---------|
| `src/main.tsx` | ReactDOM entry point |
| `src/App.tsx` | React Router — `/login`, `/register`, `/dashboard`, `/admin` |
| `src/api/client.ts` | Fetch wrapper with auto-refresh token, stores tokens in localStorage |
| `src/pages/Login.tsx` | Login form with error display |
| `src/pages/Register.tsx` | Registration form (name, email, password, role) |
| `src/pages/Dashboard.tsx` | Check-in/out buttons + own attendance history |
| `src/pages/AdminPanel.tsx` | Tabbed view: all users + all attendance (admin only) |
| `src/components/Navbar.tsx` | Navigation with role-aware links + logout |
| `src/components/ProtectedRoute.tsx` | Redirects to login if unauthenticated |

### Config Files

| File | Purpose |
|------|---------|
| `package.json` | Root — scripts: `dev`, `build`, `preview` |
| `tsconfig.json` | Frontend TypeScript config |
| `tsconfig.node.json` | Server TypeScript config |
| `vite.config.ts` | Vite with proxy `/api` → `http://localhost:3001` |
| `index.html` | Vite React entry HTML |
| `.env` | Local env vars (JWT_SECRET, REFRESH_SECRET, PORT) |
| `.env.example` | Template for production env vars |

---

## 2. How to Run Locally

```bash
cd /Users/karankendre/attendance-auth

# Install dependencies (already done)
npm install

# Copy env file (already done)
cp .env.example .env

# Run both frontend (Vite) + backend (tsx)
npm run dev
```

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001
- Vite proxies `/api/*` → `http://localhost:3001` automatically.

---

## 3. How to Deploy to Vercel

The Express server needs to run as a single serverless-compatible Node function on Vercel.

### Option A: Single Serverless Function (Recommended)

Create `api/index.ts` that wraps the Express app:

```typescript
import app from '../server/index.js';
export default app;
```

Add `vercel.json`:
```json
{
  "version": 2,
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index.js" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Option B: Separate API Routes

Move each route to `api/auth.ts`, `api/users.ts`, `api/attendance.ts` and use Vercel serverless functions.

### Required Environment Variables on Vercel

Set in Vercel dashboard:
- `JWT_SECRET` — strong random string
- `REFRESH_SECRET` — strong random string
- `PORT` — Vercel will set this automatically

### Deploy

```bash
vercel deploy /Users/karankendre/attendance-auth
```

---

## 4. Test Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@test.com | adminpass123 |
| **Employee** | emp@test.com | emppass123 |

> These were created during the smoke test. Register your own at `/register`.

### Key Behaviors
- Access token expires in **15 minutes**; refresh token expires in **7 days**
- On token expiry, the frontend API client automatically calls `/api/auth/refresh`
- Employees **cannot** access `/admin` — they are redirected to `/dashboard`
- All `/api/*` routes except `/api/auth/login` and `/api/auth/register` require a valid JWT
