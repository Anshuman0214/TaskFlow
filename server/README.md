# TaskFlow — server

The backend for TaskFlow: a multi-tenant task management REST API.

## Stack

- Node.js + Express + TypeScript
- MongoDB Atlas (via Mongoose)
- Redis (ioredis) — session store
- JWT access tokens + HTTP-only refresh token cookies
- Zod — request validation
- Winston — logging
- Vitest + Supertest — testing
- Swagger / OpenAPI — served at `/api/docs`

## Setup

```bash
pnpm install
cp .env.examples .env   # fill in MongoDB, Redis, and JWT secret values
pnpm dev                 # http://localhost:5000
```

Redis can be run locally without installing it: `docker compose up -d redis`. MongoDB is expected to be a real Atlas connection string in `.env`.

## Scripts

- `pnpm dev` — start the dev server with hot reload
- `pnpm build` / `pnpm start` — compile and run the production build
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm lint` — run ESLint
- `pnpm test` / `pnpm test:watch` — run the Vitest suite (needs a reachable MongoDB + Redis, see `tests/setup.ts`)

## Structure

```
src/
├── config/       → environment loading/validation
├── database/     → MongoDB and Redis connections
├── docs/         → OpenAPI document
├── middleware/   → cross-cutting Express middleware (errors, validation, request logging)
├── modules/      → one folder per domain (auth, users, organizations, audit, system, …), each
│                   with its own routes → controller → service → repository → model
├── routes/       → route mounting (versioned under /api/v1)
└── utils/        → shared helpers (AppError, logger, response shape)
```

Layering follows `../Docs/Rules.md`: routes never contain logic, controllers never touch the database directly, and all persistence goes through a repository.

## Current status

See `../Docs/Track.md` for the live milestone tracker. As of now: M0 (Project Foundation), M1 (Authentication), and M2 (Organizations) are complete; M3 (Workspaces) is up next.
