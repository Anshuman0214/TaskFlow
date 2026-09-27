# TaskFlow

TaskFlow is a **multi-tenant task management platform** — think of it as a tool like Jira or Trello, where different companies (tenants) can each create an account, invite their team, and organize their work into projects and tasks.

> **Status: 🟡 In active development — all features built, not yet deployed.** Every feature milestone is complete end-to-end, backend API *and* frontend UI: Auth, Organizations, Workspaces, Projects, Tasks, Collaboration (comments, attachments, activity timeline), Notifications (in-app + email, background jobs), and Dashboards & Search. 99 automated tests pass. What's left is hardening and shipping — full test coverage and a security review (M10), then deployment (M11–M12). See [Project Progress](#project-progress) below for exactly what's done.

---

## What TaskFlow Does

Every company that signs up gets its own private space. Inside that space, work is organized in a simple hierarchy:

```
Organization  (a company/team account)
   └── Workspace   (a department, e.g. "Engineering" or "Marketing")
         └── Project   (a body of work, e.g. "Website Redesign")
               └── Task   (a single to-do item, with a status, priority, and due date)
```

Team members can be invited into an organization, assigned roles (Owner, Admin, Manager, Member, Guest), and given tasks to work on. Tasks support subtasks, labels, assignment, priorities, due dates, comments (with @-mentions), file attachments, and a full activity history. People get notified when they're assigned work, mentioned in a comment, or a deadline is approaching.

Companies' data is always kept separate — one organization can never see or access another organization's data. This is called **tenant isolation**, and it's a core rule the whole system is built around.

---

## Key Features

- **Accounts & Login** — secure sign-up, email verification, and login using industry-standard authentication (JWT access tokens + refresh tokens).
- **Organizations & Teams** — create a company workspace, invite teammates, assign roles and permissions.
- **Projects & Tasks** — organize work into projects, break work into tasks, track status (To Do → In Progress → Done), set priorities and due dates.
- **Collaboration** — comments with @-mentions, file attachments, and an activity timeline on every task.
- **Notifications** — get notified when you're assigned a task, mentioned in a comment, or a deadline is approaching — in-app and by email, delivered by a background job queue.
- **Dashboards & Search** — see your workload at a glance, track project progress and team activity, and search across tasks, projects, workspaces and people.

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Backend | Node.js + Express + TypeScript | The server that powers the API |
| Database | MongoDB (via Mongoose) | Stores all application data |
| Caching / Sessions | Redis | Fast lookups, login session storage, dashboard caching |
| Background jobs | BullMQ (on Redis) | Sends notifications and due-date reminders off the request path |
| File storage | Cloudinary (optional) | Task attachments — falls back to local disk when not configured |
| Email | Nodemailer (optional SMTP) | Verification, invites, notifications — logs instead of sending when not configured |
| Validation | Zod | Checks that incoming data is well-formed |
| Security | Helmet, CORS, bcrypt, JWT | Protects the API and user passwords |
| Testing | Vitest + Supertest | Automated tests for the backend |
| Frontend | React + TypeScript + Vite + Tailwind CSS | The website users will interact with |
| Frontend data/routing | TanStack Query, React Router, Axios | Talking to the API, caching, navigation |

**API style:** TaskFlow exposes a REST API (a standard way for a frontend, mobile app, or other service to talk to the backend over the internet using simple web requests).

---

## Project Progress

Development follows a milestone plan — each milestone must be working and tested before the next one starts. Full details live in [`Docs/Track.md`](Docs/Track.md).

| Milestone | What it covers | Status |
|---|---|---|
| **M0 – Project Foundation** | Server setup, database connections, security, logging, Docker, frontend scaffold | 🟡 ~95% |
| **M1 – Authentication** | Register, login, logout, email verification, password reset | ✅ 100% |
| **M2 – Organizations** | Create/manage companies, invite members, roles | ✅ 100% |
| **M3 – Workspaces** | Departments within an organization, workspace teams | ✅ 100% |
| **M4 – Projects** | Create and manage projects, labels | ✅ 100% |
| **M5 – Tasks** | Create, assign, and track tasks, subtasks | ✅ 100% |
| **M6 – Collaboration** | Comments, file attachments, activity timeline | ✅ 100% |
| **M7 – Notifications** | In-app + email alerts, background jobs, due-date reminders | ✅ 100% |
| **M8 – Dashboard & Search** | Overview screens, analytics, full-text search | ✅ 100% |
| **M9 – Frontend** | The actual website UI | ✅ 100% |
| M10 – Testing & Quality | Full test coverage, security review | ⬜ Not started |
| M11 – Deployment | Putting it live on the internet | ⬜ Not started |
| M12 – Release | Version 1.0 launch | ⬜ Not started |

**What's working right now:**
- The backend server starts up and connects to the database.
- A health-check endpoint reports whether the database and cache are online.
- Security protections (rate limiting, safe headers, restricted cross-origin access) are in place.
- Full authentication: register, verify email, login, logout (single device or all devices), refresh-token rotation, forgot/reset password. JWT access tokens + HTTP-only refresh cookie, sessions backed by Redis + MongoDB.
- Organizations: create a company account (you become the Owner), invite teammates by email, accept/decline invitations, list/update member roles, remove members, update or delete the organization — all with role-based permission checks (Owner/Admin/Manager/Member/Guest).
- Workspaces: departments within an organization, with their own member roster, archive/delete.
- Projects: create/manage inside a workspace, with labels, status workflow (Planning → Active → On Hold → Completed → Archived), archive/delete.
- Tasks: create/assign/track inside a project, with subtasks, priorities, due dates, a status workflow, and an activity trail — soft delete with restore.
- Collaboration: comments on tasks (paginated, editable by their author or an admin, with @-mentions validated against organization membership), file attachments (size-capped, restricted to known file types), and a read-only activity timeline covering every task, comment and attachment event.
- Notifications: an in-app notification list with unread counts and read/type filters, plus emails. Written by a background job queue rather than on the request path, so a slow email never slows down the action that caused it. Includes an hourly sweep that reminds people about tasks due within 24 hours.
- Dashboards: a personal workload summary (assigned, pending, due today, overdue, completed), personal productivity (completion counts, average time-to-done, per-week history), per-workspace project progress and team activity, and a per-project breakdown by status and priority. Cached in Redis so repeated loads are cheap.
- Search: full-text search across tasks, projects, workspaces and people, with filters (status, priority, assignee, label, due date, workspace) — always scoped to your own organization.
- Automated tests run and pass for everything built (99 backend integration tests, run against a real database).
- A full frontend (`client/`) is live: register/login/password-reset screens, and a working app for organizations, workspaces, projects, tasks, comments, attachments, notifications, dashboards and search — all through the actual UI, role-gated to match the backend.

**What's not built yet:**
- Not deployed anywhere — it runs locally only (Milestones 11–12). No CI pipeline yet.
- Full test coverage and a formal security review are Milestone 10; the 99 tests today are integration tests, not exhaustive coverage.
- Real-time updates (live task changes, presence) are deliberately post-1.0 — notifications are polled, not pushed over a socket.
- Restoring a soft-deleted task isn't reachable from the UI (the API supports it, but there's no "show deleted tasks" list to surface a restore action from).
- Notifications aren't deep-linked — they tell you what happened, but you navigate to the task yourself.
- Email and file uploads run on local fallbacks out of the box: without SMTP credentials emails are logged instead of sent, and without Cloudinary credentials attachments are written to local disk. Those local attachment URLs aren't access-controlled, so configure Cloudinary before exposing this publicly.

---

## Repository Structure

```
TaskFlow/
├── Docs/     → All planning documents: requirements, API design, database design, rules
├── server/   → The backend (Node.js + Express + TypeScript API)
└── client/   → The frontend (Vite + React + TypeScript)
```

---

## Running the Backend Locally

1. Install [Node.js](https://nodejs.org) and [pnpm](https://pnpm.io).
2. Go into the server folder: `cd server`
3. Install dependencies: `pnpm install`
4. Copy `.env.examples` to `.env` and fill in your own MongoDB, Redis, and JWT secret values.
5. Start the server: `pnpm dev`

Redis is required, not optional — it backs login sessions, the notification job queue, and dashboard caching.

A Docker setup (`server/docker-compose.yml`) is also provided to run the database and cache without installing them yourself — `docker compose up -d redis` is enough if you already have a MongoDB Atlas connection string.

**Optional environment variables.** Everything works without these; each one has a local fallback:

| Variable(s) | Without it | With it |
|---|---|---|
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Emails are written to the log instead of sent | Real email delivery |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Attachments are stored on local disk under `UPLOAD_DIR` and served from `/uploads` | Attachments are stored in Cloudinary |
| `MAX_UPLOAD_BYTES` | 10 MB attachment limit | Your own limit |

Run the tests with `pnpm test` (they need a reachable MongoDB and Redis), and `pnpm typecheck`, `pnpm lint`, `pnpm build` for the usual checks. Interactive API docs are served at `http://localhost:5000/api/docs`.

## Running the Frontend Locally

1. Go into the client folder: `cd client`
2. Install dependencies: `pnpm install`
3. Copy `.env.example` to `.env` (defaults to `http://localhost:5000/api/v1`, matching the backend above).
4. Start the dev server: `pnpm dev`, then open `http://localhost:5173`.

---

## Documentation

Everything about how TaskFlow is designed and built is documented in the [`Docs/`](Docs) folder:

- `ProjectReq.md` — what the product does and why
- `TechReq.md` — the full technology choices
- `DatabaseDesign.md` — how data is structured and stored
- `ApiSpecifications.md` — every API endpoint, planned and documented
- `Rules.md` — the engineering standards every change must follow
- `Track.md` — the live development tracker
