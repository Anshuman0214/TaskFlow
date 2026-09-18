track.md
TaskFlow Development Tracker
Project Status: 🟡 In Development
Current Version: v1.0.0
Started: 2026-09-18
________________________________________
Overall Progress
Milestone	Status	Progress
M0 - Project Foundation	🟡	95%
M1 - Authentication	✅	100%
M2 - Organizations	⬜	0%
M3 - Workspaces	⬜	0%
M4 - Projects	⬜	0%
M5 - Tasks	⬜	0%
M6 - Collaboration	⬜	0%
M7 - Notifications	⬜	0%
M8 - Dashboard & Search	⬜	0%
M9 - Frontend Integration	⬜	0%
M10 - Testing & Quality	⬜	0%
M11 - Deployment	⬜	0%
M12 - Release	⬜	0%
Legend
•	⬜ Not Started
•	🟡 In Progress
•	✅ Completed
•	⛔ Blocked
________________________________________
Milestone Tracker
M0 — Project Foundation
Tasks
•	✅ Initialize repository
•	✅ Setup backend
•	✅ Setup frontend (`client/`: Vite + React 19 + TypeScript, Tailwind CSS v4, React Router, TanStack Query, Axios, React Hook Form + Zod, ESLint — per `Docs/TechReq.md` §3. Scope is foundation only: API client with an auth-token refresh interceptor, and a status page proving live connectivity. Login/register UI is explicitly M9 scope, not built here.)
•	✅ Configure TypeScript
•	⛔ Configure ESLint (backend: config exists but typescript-eslint@8.66.0 does not support typescript@7.0.2 — `pnpm lint` currently fails; pre-existing, not caused by M0 work; see Technical Debt. Frontend `client/` ESLint is configured and passing.)
•	⬜ Configure Biome/Prettier (not started)
•	✅ Configure Docker (Dockerfile + docker-compose.yml added; verified 2026-09-18 — Docker Desktop started and `docker compose up -d redis` runs a healthy container)
•	✅ Configure Docker Compose (app + mongo + redis services with healthchecks)
•	✅ Configure MongoDB (connected and verified against live Atlas cluster)
•	✅ Configure Redis (ioredis wired with fail-fast connect; verified it attempts connection and fails correctly when no Redis is reachable)
•	✅ Configure Swagger (minimal OpenAPI doc served at /api/docs, covers currently-live endpoints only)
•	✅ Configure Logging (Winston logger; replaced console.log/error across server.ts, mongodb.ts, redis.ts, error/requestTime middleware)
•	✅ Configure Error Handling (AppError + centralized error middleware; dead duplicate errors/AppErrors.ts removed)
•	✅ Create Folder Structure
•	✅ Health Check Endpoint (GET /api/v1/system/health + /system/info, module-layered per Rules.md, covered by tests)
Security hardening added alongside M0 (helmet, cors restricted to CORS_ORIGIN, cookie-parser, express-rate-limit on /api, 10kb JSON body limit, trust proxy)
Exit Criteria
•	✅ Backend starts successfully (verified: MongoDB connects on boot)
•	✅ Frontend starts successfully (verified 2026-09-18: `pnpm dev` in `client/` serves on :5173, `pnpm build`/`pnpm lint`/`tsc -b` all pass, and the status page was opened in a real browser showing live "connected" badges for API/Database/Redis)
•	✅ Docker environment operational (verified 2026-09-18: Docker Desktop launched and `docker compose up -d redis` produced a healthy container backing the backend's Redis session store)
•	✅ Health endpoint working (verified via automated tests, a live dev-server run, and now consumed cross-origin by the frontend with credentials)
________________________________________
M1 — Authentication
•	✅ Register (email/password + strong-password policy; account starts unverified)
•	✅ Email Verification (hashed single-use token stored on the user doc, 24h expiry; email delivery stubbed to the logger — no SMTP provider configured yet, see Technical Debt)
•	✅ Login (rejects unverified/disabled accounts; generic "invalid credentials" message)
•	✅ Logout (revokes the current session only)
•	✅ Logout All (revokes every session for the user)
•	✅ Refresh Token (rotated on every use; old refresh token invalidated)
•	✅ Forgot Password (anti-enumeration: always returns the same success message; 30 min token expiry)
•	✅ Reset Password (revokes all active sessions on success)
•	✅ Session Management (Mongo `Session` collection for persistent/audit record, keyed by TTL index)
•	✅ JWT Authentication (short-lived access token in response body, `requireAuth` middleware)
•	✅ HTTP-only Cookies (refresh token only, `secure` in production, scoped to `/api/v1/auth`)
•	✅ Redis Sessions (Redis is the fast/authoritative store for whether a session's refresh token is still valid; Mongo holds the durable device/audit record)
•	✅ Bonus: `GET /api/v1/auth/me` (not in the original M1 list, but trivial once `requireAuth` exists and needed to prove the JWT flow end-to-end)
Exit Criteria
•	✅ All endpoints above implemented, wired, validated (Zod), rate-limited per `Docs/ApiSpecifications.md`, and covered by integration tests (17 tests in `tests/auth.test.ts`, run against the real dev MongoDB Atlas cluster + a local Redis via `docker compose up -d redis`)
•	✅ `pnpm typecheck`, `pnpm build`, `pnpm test` all pass
________________________________________
M2 — Organizations
•	Organization CRUD
•	Membership Management
•	Invitations
•	Role Management
________________________________________
M3 — Workspaces
•	Workspace CRUD
•	Workspace Validation
•	Workspace Permissions
________________________________________
M4 — Projects
•	Project CRUD
•	Labels
•	Project Validation
•	Project Status Workflow
________________________________________
M5 — Tasks
•	Task CRUD
•	Subtasks
•	Assignment
•	Priorities
•	Due Dates
•	Status Workflow
•	Task Activities
________________________________________
M6 — Collaboration
•	Comments
•	Attachments
•	Cloudinary Integration
•	Activity Timeline
________________________________________
M7 — Notifications
•	Notification APIs
•	BullMQ
•	Email Notifications
•	Reminder Jobs
________________________________________
M8 — Dashboard & Search
•	Dashboard APIs
•	Analytics
•	Search APIs
•	Redis Cache
________________________________________
M9 — Frontend
•	Authentication UI
•	Organization UI
•	Workspace UI
•	Project UI
•	Task UI
•	Dashboard UI
•	Search UI
________________________________________
M10 — Testing
•	Unit Tests
•	Integration Tests
•	API Tests
•	Performance Tests
•	Security Review
________________________________________
M11 — Deployment
•	Docker Images
•	GitHub Actions
•	AWS Deployment
•	MongoDB Atlas
•	Redis
•	Domain
•	SSL
•	Monitoring
________________________________________
M12 — Release
•	Final Testing
•	Documentation Review
•	Performance Review
•	Release Notes
•	Version Tag
________________________________________
Current Sprint
Sprint Goal
M2 — Organizations (multi-tenancy foundation).
Planned Tasks (in dependency order)
•	[ ] `Organization` model + repository (name, slug (unique, URL-safe), description/logo/settings placeholders, Base Entity fields incl. soft delete)
•	[ ] `OrganizationMember` model + repository (userId + organizationId + role, compound unique index on organizationId+userId, per Docs/DatabaseDesign.md §3 "OrganizationMembers")
•	[ ] Role enum: OWNER, ADMIN, MANAGER, MEMBER, GUEST (Docs/ApiSpecifications.md "Organization Roles")
•	[ ] `requireOrganizationRole(...)` middleware — resolves the caller's membership + role for `:organizationId` in the route and rejects non-members/insufficient roles. Every M2+ endpoint depends on this; build it once, not per-route.
•	[ ] POST /api/v1/organizations (create org, creator becomes OWNER via OrganizationMember, txn since it's two writes)
•	[ ] GET /api/v1/organizations (list current user's orgs, via their OrganizationMember rows)
•	[ ] GET /api/v1/organizations/:organizationId (member-only)
•	[ ] PATCH /api/v1/organizations/:organizationId (OWNER/ADMIN only; name/logo/description)
•	[ ] DELETE /api/v1/organizations/:organizationId (OWNER only; soft delete + cascade per Docs/DatabaseDesign.md "Cascade Rules" — revoke members' sessions, soft-delete future child resources once they exist)
•	[ ] Organization Member endpoints: list / invite / update role / remove (`/organizations/:organizationId/members`), incl. "exactly one Owner" and "can't remove/demote self" business rules
•	[ ] Invitation model + repository + email-invite flow (reuses the mailer stub pattern from M1)
•	[ ] Introduce the `AuditLog` collection now (it's organizationId-scoped per the DB design, so M1 had nothing to attach it to) — write on ORGANIZATION_CREATED/UPDATED/DELETED, MEMBER_INVITED/ROLE_UPDATED/REMOVED
Key Decisions Carried From M1
•	Repository layer is mandatory (server/src/modules/*/*.repository.ts) — controllers/services never touch Mongoose models directly, per Docs/Rules.md §5.
•	Tenant isolation rule from here on: every M2+ query must filter by organizationId; there is no cross-org access, ever.
•	`requireAuth` (M1) gives `req.userId`; M2 adds `requireOrganizationRole` on top of it — auth and tenant authorization stay separate middlewares, composed per route.
Completed
•	[x] M1 — Authentication (see above)
Blockers
•	None
________________________________________
Technical Debt
Priority	Item	Status
High	typescript-eslint@8.66.0 does not support typescript@7.0.2 — `pnpm lint` fails to even load the config. Fix by pinning typescript to a 6.x line typescript-eslint supports, or waiting for typescript-eslint to add TS 7 support.	Open
Medium	Empty placeholder folders under server/src (controllers/, respositories/, services/, types/, validators/, constants/) left over from before the modules/ pattern was adopted — safe to delete.	Open
Medium	No real email provider configured. `modules/auth/mailer.ts` logs verification/reset links instead of sending them. Swap in nodemailer/SES/Resend once SMTP credentials exist — call sites (`sendVerificationEmail`/`sendPasswordResetEmail`) don't need to change.	Open
Low	Refresh-token rate limit (60/user/hour per spec) is currently keyed by IP, not by user, since the user isn't known until the refresh token is decoded inside the handler. Add a keyed limiter if this needs to be per-user.	Open
Low	`revokeAllSessionsForUser` uses Redis `KEYS` to find a user's session keys — O(n) over the whole keyspace. Fine at current scale; switch to `SCAN` or a per-user Redis SET of session ids if the keyspace grows large.	Open
________________________________________
Known Bugs
Severity	Description	Status
Critical	None	Open
Major	None	Open
Minor	None	Open
________________________________________
Future Versions
v1.1
•	Socket.IO
•	Live Notifications
•	Presence
•	Live Task Updates
v1.2
•	Analytics Optimization
•	Scheduled Reports
•	Redis Improvements
v2.0
•	GraphQL
•	Advanced Reporting
v3.0
•	Microservices
•	gRPC
•	Event-Driven Architecture

