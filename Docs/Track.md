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
M2 - Organizations	✅	100%
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
•	✅ Organization CRUD (create/list/get/update/soft-delete; auto-unique URL-safe slug; `requireOrganizationRole` middleware gates every org-scoped route)
•	✅ Membership Management (list/invite/update-role/remove under `/organizations/:organizationId/members`; owner protections: Owner's role can never be changed or removed, callers can't remove themselves)
•	✅ Invitations (hashed single-use token on a separate `Invitation` collection, 7-day expiry, `POST /organizations/invitations/accept`; email delivery reuses the M1 mailer-stub pattern)
•	✅ Role Management (OWNER/ADMIN/MANAGER/MEMBER/GUEST enum; OWNER only ever granted at org creation, never assignable through the member endpoints)
•	✅ `AuditLog` collection introduced (append-only, no update/delete anywhere in the codebase); written on ORGANIZATION_CREATED/UPDATED/DELETED, MEMBER_INVITED/ROLE_UPDATED/REMOVED
Exit Criteria
•	✅ All endpoints implemented, validated (Zod), authorized (`requireAuth` + `requireOrganizationRole`), and covered by integration tests (9 tests in `tests/organizations.test.ts`, run against the real dev MongoDB Atlas cluster)
•	✅ `pnpm typecheck`, `pnpm build`, `pnpm test` all pass (26 tests total)
•	✅ Manually verified end-to-end against a live dev server: create → invite → accept → list members → role update → owner-protection rejections → remove → soft-delete
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
M3 — Workspaces. Not yet planned in detail (M2 finished this session; ask to plan M3 when ready to start it).
Key Decisions Carried From M2 (apply to M3 and onward)
•	Repository layer is mandatory (server/src/modules/*/*.repository.ts) — controllers/services never touch Mongoose models directly, per Docs/Rules.md §5.
•	Tenant isolation rule: every M2+ query must filter by organizationId; there is no cross-org access, ever.
•	`requireAuth` (M1) gives `req.userId`; `requireOrganizationRole` (M2) is composed on top of it per route. A future `requireWorkspaceRole`-style check for M3 should follow the same "compose, don't inline" pattern rather than re-checking membership ad hoc in controllers.
•	No multi-document Mongo transactions: this Atlas tier doesn't support retryable-write transactions (confirmed in M2 — `createOrganization` originally used `session.withTransaction` and failed at runtime). Multi-write operations use sequential writes with manual compensation (see `organization.service.ts`'s `createOrganization` for the pattern) instead.
Completed
•	[x] M1 — Authentication (see above)
•	[x] M2 — Organizations (see above)
Blockers
•	None
________________________________________
Technical Debt
Priority	Item	Status
High	typescript-eslint@8.66.0 does not support typescript@7.0.2 — `pnpm lint` fails to even load the config. Fix by pinning typescript to a 6.x line typescript-eslint supports, or waiting for typescript-eslint to add TS 7 support.	Open
Medium	Empty placeholder folders under server/src (controllers/, respositories/, services/, types/, validators/, constants/) left over from before the modules/ pattern was adopted — safe to delete.	Open
Medium	No real email provider configured. `utils/mailer.ts` (moved here in M2, was `modules/auth/mailer.ts`) logs verification/reset/invite links instead of sending them. Swap in nodemailer/SES/Resend once SMTP credentials exist — call sites don't need to change.	Open
Low	Refresh-token rate limit (60/user/hour per spec) is currently keyed by IP, not by user, since the user isn't known until the refresh token is decoded inside the handler. Add a keyed limiter if this needs to be per-user.	Open
Low	`revokeAllSessionsForUser` uses Redis `KEYS` to find a user's session keys — O(n) over the whole keyspace. Fine at current scale; switch to `SCAN` or a per-user Redis SET of session ids if the keyspace grows large.	Open
Low	No decline-invitation or list-pending-invitations endpoints — not in `Docs/ApiSpecifications.md`'s documented endpoint list, so not built (YAGNI). A pending invite simply sits until it expires (7 days) or is superseded by a fresh invite to the same email.	Open
Low	Deleting an organization doesn't touch its `OrganizationMember` rows (matches `Docs/DatabaseDesign.md`'s cascade rules exactly — membership isn't listed there). They become orphaned but harmless since `requireOrganizationRole` looks up the organization first and 404s on a deleted one.	Open
Low	`Docs/DatabaseDesign.md`'s org-deletion cascade also says to "revoke active sessions for members of that organization" — deliberately not implemented. M1 sessions are global per user (JWT payload is just `{userId, sessionId}`, not org-scoped), so revoking them on one org's deletion would log a user out of every other org they belong to. Revisit if sessions ever become org-scoped.	Open
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

