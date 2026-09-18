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
├── api/       → typed wrappers over the backend REST API + the axios client
├── lib/       → shared setup (TanStack Query client, etc.)
├── pages/     → route-level components
├── App.tsx    → route definitions
└── main.tsx   → app entry point, providers
```

## Scope

This is the M0 foundation only: project scaffold, an API client wired to the backend
(auth-token refresh interceptor, typed calls for every backend endpoint), and a status
page proving the connection works. Login/register/dashboard screens are Milestone 9
(Frontend) work — see `../Docs/Track.md`.
