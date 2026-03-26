# Attendance Website — User Auth System Spec

**Task ID:** auth-001
**Status:** Spec
**Author:** Mitchell (Orchestrator)

---

## 1. Overview

A complete user authentication system for an attendance tracking website. Users can register, log in, and manage their profiles. Role-based access: **Admin** (manage users/attendance) and **Employee** (mark/check in/out).

---

## 2. Tech Stack

- **Frontend:** React + Vite (TypeScript)
- **Backend:** Node.js + Express (TypeScript)
- **Database:** SQLite (via better-sqlite3) — simple, file-based, no setup needed
- **Auth:** JWT (access + refresh tokens), bcrypt for password hashing
- **Deployment:** GitHub + Vercel (frontend + API on same Vercel部署)

---

## 3. Functionality

### 3.1 User Registration
- Fields: name, email, password, role (employee default)
- Password: min 8 chars, hashed with bcrypt (12 rounds)
- On success: auto-login + JWT issued
- Validation: unique email required

### 3.2 User Login
- Fields: email, password
- On success: access token (15min) + refresh token (7 days) returned
- On failure: generic "Invalid credentials" (no info leakage)

### 3.3 JWT Auth Middleware
- Access token in `Authorization: Bearer <token>` header
- Protects all `/api/*` routes except `/api/auth/register` and `/api/auth/login`
- Refresh token flow: `/api/auth/refresh` — issues new access token

### 3.4 Role-Based Access Control (RBAC)
- **Employee:** can view own profile, mark attendance (check-in/check-out)
- **Admin:** can view all users, view all attendance records, promote/demote users

### 3.5 Attendance Marking
- Employee can `POST /api/attendance/checkin` — records timestamp
- Employee can `POST /api/attendance/checkout` — records timestamp
- Employee can `GET /api/attendance/me` — own attendance history
- Admin can `GET /api/attendance/all` — all employees' attendance

### 3.6 Profile
- `GET /api/users/me` — own profile
- `PUT /api/users/me` — update name/password
- Admin only: `GET /api/users/all` — list all users

---

## 4. API Endpoints

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | /api/auth/register | No | — | Register new user |
| POST | /api/auth/login | No | — | Login |
| POST | /api/auth/refresh | No | — | Refresh access token |
| GET | /api/users/me | Yes | Any | Get own profile |
| PUT | /api/users/me | Yes | Any | Update own profile |
| GET | /api/users/all | Yes | Admin | List all users |
| POST | /api/attendance/checkin | Yes | Employee+ | Check in |
| POST | /api/attendance/checkout | Yes | Employee+ | Check out |
| GET | /api/attendance/me | Yes | Employee+ | Own attendance |
| GET | /api/attendance/all | Yes | Admin | All attendance |

---

## 5. Data Models

### User
```sql
id          INTEGER PRIMARY KEY AUTOINCREMENT
email      TEXT UNIQUE NOT NULL
name       TEXT NOT NULL
password   TEXT NOT NULL  -- bcrypt hash
role       TEXT DEFAULT 'employee'  -- 'admin' | 'employee'
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

### Attendance
```sql
id          INTEGER PRIMARY KEY AUTOINCREMENT
user_id     INTEGER REFERENCES users(id)
type        TEXT NOT NULL  -- 'checkin' | 'checkout'
timestamp   DATETIME DEFAULT CURRENT_TIMESTAMP
```

### RefreshTokens
```sql
id          INTEGER PRIMARY KEY AUTOINCREMENT
user_id     INTEGER REFERENCES users(id)
token       TEXT UNIQUE NOT NULL
expires_at  DATETIME NOT NULL
```

---

## 6. Project Structure

```
attendance-auth/
├── SPEC.md
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html
├── server/
│   ├── index.ts           -- Express app entry
│   ├── db.ts              -- SQLite setup + migrations
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── users.ts
│   │   └── attendance.ts
│   └── middleware/
│       ├── auth.ts       -- JWT verification
│       └── rbac.ts       -- Role checks
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── api/
│   │   └── client.ts     -- API client with token handling
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── Dashboard.tsx
│   │   └── AdminPanel.tsx
│   └── components/
│       ├── Navbar.tsx
│       └── ProtectedRoute.tsx
└── .env.example
```

---

## 7. Deployment

- **GitHub Repo:** `attendance-auth` under `kendrekaran`
- **Vercel:**托管 full-stack app (React frontend + Express API as serverless functions or single Node server)
- Env vars: `JWT_SECRET`, `REFRESH_SECRET`

---

## 8. Acceptance Criteria

- [ ] User can register with email/password
- [ ] User can login and receive JWT
- [ ] Protected routes reject unauthenticated requests
- [ ] Employees can check in/out
- [ ] Admins can see all users and all attendance
- [ ] Refresh token flow works
- [ ] Deployed and accessible on Vercel
- [ ] No hardcoded secrets in code

---

## 9. Out of Scope

- Email verification
- Password reset
- OAuth / SSO
- Advanced analytics
- Multiple organizations/tenants
