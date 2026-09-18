# TaskFlow

TaskFlow is a **multi-tenant task management platform** — think of it as a tool like Jira or Trello, where different companies (tenants) can each create an account, invite their team, and organize their work into projects and tasks.

> **Status: 🟡 In active development.** Authentication and multi-tenant organizations are complete on the backend, with a minimal frontend foundation talking to it. There is no full app yet — see [Project Progress](#project-progress) below for exactly what's done.

---

## What TaskFlow Does

Every company that signs up gets its own private space. Inside that space, work is organized in a simple hierarchy:

```
Organization  (a company/team account)
   └── Workspace   (a department, e.g. "Engineering" or "Marketing")
         └── Project   (a body of work, e.g. "Website Redesign")
               └── Task   (a single to-do item, with a status, priority, and due date)
```

Team members can be invited into an organization, assigned roles (Owner, Admin, Manager, Member, Guest), and given tasks to work on. Tasks support comments, file attachments, and an activity history, so teams can collaborate without leaving the platform.

Companies' data is always kept separate — one organization can never see or access another organization's data. This is called **tenant isolation**, and it's a core rule the whole system is built around.

---

## Key Features (Planned)

- **Accounts & Login** — secure sign-up, email verification, and login using industry-standard authentication (JWT access tokens + refresh tokens).
- **Organizations & Teams** — create a company workspace, invite teammates, assign roles and permissions.
- **Projects & Tasks** — organize work into projects, break work into tasks, track status (To Do → In Progress → Done), set priorities and due dates.
- **Collaboration** — comments, file attachments, and an activity timeline on every task.
- **Notifications** — get notified when you're assigned a task, mentioned in a comment, or a deadline is approaching.
- **Dashboards & Search** — see your workload at a glance and search across all your projects and tasks.

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Backend | Node.js + Express + TypeScript | The server that powers the API |
| Database | MongoDB (via Mongoose) | Stores all application data |
| Caching / Sessions | Redis | Fast lookups and login session storage |
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
| M3 – Workspaces | Departments within an organization | ⬜ Not started |
| M4 – Projects | Create and manage projects | ⬜ Not started |
| M5 – Tasks | Create, assign, and track tasks | ⬜ Not started |
| M6 – Collaboration | Comments and file attachments | ⬜ Not started |
| M7 – Notifications | Email and in-app alerts | ⬜ Not started |
| M8 – Dashboard & Search | Overview screens and search | ⬜ Not started |
| M9 – Frontend | The actual website UI | ⬜ Not started |
| M10 – Testing & Quality | Full test coverage, security review | ⬜ Not started |
| M11 – Deployment | Putting it live on the internet | ⬜ Not started |
| M12 – Release | Version 1.0 launch | ⬜ Not started |

**What's working right now:**
- The backend server starts up and connects to the database.
- A health-check endpoint reports whether the database and cache are online.
- Security protections (rate limiting, safe headers, restricted cross-origin access) are in place.
- Full authentication: register, verify email, login, logout (single device or all devices), refresh-token rotation, forgot/reset password. JWT access tokens + HTTP-only refresh cookie, sessions backed by Redis + MongoDB.
- Organizations: create a company account (you become the Owner), invite teammates by email, accept invitations, list/update member roles, remove members, update or delete the organization — all with role-based permission checks (Owner/Admin/Manager/Member/Guest).
- Automated tests run and pass for everything built so far (26 tests).
- A minimal frontend (`client/`) boots, calls the backend's health endpoint across origins with credentials, and renders live connection status in the browser.

**What's not working yet:**
- There's no UI to actually use any of this from the browser yet — the API supports it, but the screens are Milestone 9 (Frontend) work, not built yet.
- Workspaces, projects, and tasks (Milestones 3–8) haven't been built.

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

A Docker setup (`server/docker-compose.yml`) is also provided to run the database and cache without installing them yourself — `docker compose up -d redis` is enough if you already have a MongoDB Atlas connection string.

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
