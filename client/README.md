# TaskFlow — client

The frontend for TaskFlow: React + TypeScript, built with Vite.

## Stack

- React + TypeScript + Vite
- Tailwind CSS v4
- React Router — client-side routing
- TanStack Query — server state / caching
- Axios — HTTP client, with an access-token refresh interceptor (`src/api/client.ts`)
- React Hook Form + Zod — forms and validation

## Setup

```bash
pnpm install
cp .env.example .env   # defaults to http://localhost:5000/api/v1
pnpm dev                # http://localhost:5173
```

The backend (`../server`) must be running, with its `CORS_ORIGIN` including `http://localhost:5173`.

## Scripts

- `pnpm dev` — start the dev server
- `pnpm build` — typecheck (`tsc -b`) and build for production
- `pnpm lint` — run ESLint
- `pnpm preview` — preview the production build locally

## Structure

```
src/
├── api/          → typed wrappers over the backend REST API + the axios client
├── components/
│   ├── ui/       → shared primitives (Button, TextField, Modal, Badge, Toast, …)
│   └── layout/   → app shell, tab navigation
├── context/      → AuthContext (current user, session boundary), ToastContext
├── lib/          → shared setup (TanStack Query client, permissions, validation, API error helpers)
├── pages/        → route-level components, one folder per resource
│   ├── auth/           → login, register, verify email, forgot/reset password
│   ├── organizations/  → org list, layout, members, settings
│   ├── workspaces/     → workspace layout, projects list, members, settings
│   ├── projects/       → project layout, tasks list, labels, settings
│   └── tasks/          → task detail page
├── routes/       → ProtectedRoute / PublicOnlyRoute guards
├── App.tsx       → route definitions
└── main.tsx      → app entry point, providers
```

## Scope

Auth, Organizations, Workspaces, Projects, and Tasks all have a working UI — register through
creating and managing tasks, role-gated to match the backend. Dashboard and Search screens are
still pending (they depend on Milestone 8's backend APIs, which don't exist yet) — see
`../Docs/Track.md`.
