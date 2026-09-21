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
M3 - Workspaces	✅	100%
M4 - Projects	✅	100%
M5 - Tasks	✅	100%
M6 - Collaboration	⬜	0%
M7 - Notifications	⬜	0%
M8 - Dashboard & Search	⬜	0%
M9 - Frontend Integration	🟡	85%
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
•	✅ Configure ESLint (backend: fixed 2026-09-21 by pinning `typescript` to a 6.x line `typescript-eslint@8.66.0` supports, ignoring `dist/`, and switching to Node globals — `pnpm lint` passes; see Technical Debt. Frontend `client/` ESLint is configured and passing.)
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
•	✅ Invitations (hashed single-use token on a separate `Invitation` collection, 5-day expiry, `POST /organizations/invitations/accept`, `GET /organizations/invitations/pending`, `POST /organizations/invitations/{id}/decline`; email delivery reuses the M1 mailer-stub pattern)
•	✅ Role Management (OWNER/ADMIN/MANAGER/MEMBER/GUEST enum; OWNER only ever granted at org creation, never assignable through the member endpoints)
•	✅ `AuditLog` collection introduced (append-only, no update/delete anywhere in the codebase); written on ORGANIZATION_CREATED/UPDATED/DELETED, MEMBER_INVITED/ROLE_UPDATED/REMOVED
Exit Criteria
•	✅ All endpoints implemented, validated (Zod), authorized (`requireAuth` + `requireOrganizationRole`), and covered by integration tests (13 tests in `tests/organizations.test.ts`, run against the real dev MongoDB Atlas cluster)
•	✅ `pnpm typecheck`, `pnpm build`, `pnpm test` all pass (30 tests total)
•	✅ Manually verified end-to-end against a live dev server: create → invite → accept → list members → role update → owner-protection rejections → remove → soft-delete
________________________________________
M3 — Workspaces
•	✅ Workspace CRUD (create/list/get/update/archive/soft-delete under `/api/v1/workspaces`; `requireWorkspaceRole` resolves the workspace, derives its `organizationId`, and delegates to the same `resolveOrganizationAccess` helper `requireOrganizationRole` uses — no duplicated membership logic)
•	✅ Workspace Members (new `WorkspaceMember` collection — a team roster, not a role table; creator is auto-added on creation; add/remove under `/api/v1/workspaces/:workspaceId/members`; adding requires the target user already be an `OrganizationMember` of the parent org)
•	✅ Workspace Validation (Zod: `createWorkspaceSchema`, `updateWorkspaceSchema`, `addWorkspaceMemberSchema`)
•	✅ Workspace Permissions (no separate workspace-level role — every check resolves through the caller's organization role via the workspace's `organizationId`; Create/Update/Manage-members need OWNER/ADMIN/MANAGER, Archive/Delete need OWNER/ADMIN, Get/List/List-members need any org membership)
•	✅ Archived workspaces are read-only for mutation: Update and Add-member are rejected (403); Delete and Remove-member still work
•	✅ `AuditLog` events: WORKSPACE_CREATED/UPDATED/ARCHIVED/DELETED, WORKSPACE_MEMBER_ADDED/REMOVED
Scope note: `Docs/ImplementationPlan.md` (written before any code existed) and `Docs/Track.md`'s more detailed M3 checklist disagreed on whether workspace membership was in scope — resolved in favor of building it, with `Docs/DatabaseDesign.md` updated to document the `WorkspaceMembers` collection.
Exit Criteria
•	✅ All endpoints implemented, validated (Zod), authorized (`requireAuth` + `requireWorkspaceRole`/org-access checks), and covered by integration tests (10 tests in `tests/workspaces.test.ts`, run against the real dev MongoDB Atlas cluster)
•	✅ `pnpm typecheck`, `pnpm build`, `pnpm test` all pass (40 tests total)
•	✅ `Docs/DatabaseDesign.md` and `Docs/ApiSpecifications.md` updated with the `WorkspaceMembers` collection and the Workspace/Workspace-Member endpoints; `server/src/docs/openapi.ts` updated to match (also backfilled the M2 invitation pending/decline endpoints it was missing)
________________________________________
M4 — Projects
•	✅ Project CRUD (create/list/get/update/soft-delete under `/api/v1/organizations/:organizationId/workspaces/:workspaceId/projects`; `requireProjectRole` derives `organizationId` from the project's own denormalized field, no extra workspace fetch, and delegates to `resolveOrganizationAccess` like every M2+ access check)
•	✅ Labels (`/api/v1/projects/:projectId/labels`, reuses `requireProjectRole` directly since the URL already carries `:projectId`; hard delete, no soft-delete — see Technical Debt-style note in `Docs/DatabaseDesign.md`'s Labels section for why)
•	✅ Project Validation (Zod: name/key/description/date-order on create, same + status on update, plus a `listProjectsQuerySchema` for pagination — the first query-string validation in the codebase, via a new `validateQuery` middleware)
•	✅ Project Status Workflow (PLANNING → ACTIVE → ON_HOLD → COMPLETED → ARCHIVED; archiving reuses the general Update endpoint per spec, no separate archive route; archived projects reject further updates (403) but still allow delete; `COMPLETED → PLANNING` specifically rejected (422), no fuller state machine than the spec calls for)
•	✅ First paginated list endpoint (`page`/`limit`/`status`/`sortBy`/`order`), `sendSuccessResponse` gained an optional `meta` field for pagination info
•	✅ `AuditLog` events: PROJECT_CREATED/UPDATED/ARCHIVED/DELETED, LABEL_CREATED/UPDATED/DELETED (Label events weren't in the original `ApiSpecifications.md` audit list — added to match, same pattern as M3's workspace-member events)
Exit Criteria
•	✅ All endpoints implemented, validated (Zod), authorized (`requireAuth` + `requireWorkspaceRole`/`requireProjectRole`), and covered by integration tests (12 tests in `tests/projects.test.ts`, run against the real dev MongoDB Atlas cluster)
•	✅ `pnpm typecheck`, `pnpm build`, `pnpm test` all pass (52 tests total)
•	✅ `Docs/DatabaseDesign.md` and `Docs/ApiSpecifications.md` updated (Label's no-soft-delete note, archived-read-only + date-order business rules spelled out on Update); `server/src/docs/openapi.ts` updated to match
•	✅ Manually verified end-to-end against a live dev server: create org → workspace → project (key auto-uppercased) → label → paginated list → status transitions → archive → update-while-archived rejected → delete
________________________________________
M5 — Tasks
•	✅ Task CRUD (create/list/get/update/soft-delete under `/api/v1/projects/:projectId/tasks`; `requireTaskRole` derives `organizationId` from the task's own denormalized field, same pattern as `requireProjectRole`)
•	✅ Subtasks (`/:taskId/subtasks` — list children; create auto-sets `parentTaskId`. A task can also be created as a subtask directly via the main Create endpoint by passing `parentTaskId`, per the spec's example request body — both paths share one service function)
•	✅ Assignment (`assigneeId` must be a `WorkspaceMember` of the task's project's workspace — first real validation use of the `WorkspaceMember` roster M3 built, not just a display list)
•	✅ Priorities (LOW/MEDIUM/HIGH/CRITICAL, default MEDIUM)
•	✅ Due Dates (`dueDate`/`startDate`, no ordering constraint specified for tasks unlike Project's start/end)
•	✅ Status Workflow (TODO → IN_PROGRESS → IN_REVIEW → DONE → ARCHIVED; `completedAt` auto-set on reaching DONE, auto-cleared on leaving it; ARCHIVED is read-only for Update, same as Workspace/Project, but delete still allowed)
•	✅ Task Activities (new `TaskActivity` collection, append-only, written alongside every `AuditLog` entry for the same event — no read endpoint yet, that's M6's "Activity Timeline")
•	✅ Restore-via-PATCH (`PATCH /:taskId { isDeleted: false }`) — a real deviation from every other module's "deleted = filtered out by the middleware" pattern; `requireTaskRole` resolves regardless of `isDeleted`, and the deleted-is-404 illusion is enforced in the service/controllers instead. See `task.middleware.ts`'s and `task.service.ts`'s comments.
•	✅ `AuditLog`/`TaskActivity` events: TASK_CREATED/UPDATED/ASSIGNED/STATUS_CHANGED/COMPLETED/DELETED/RESTORED (the last two weren't in `ApiSpecifications.md`'s original list — added to match, same pattern as M3/M4's added events)
Scope notes (flagged, not silently dropped): `estimatedHours`/`actualHours` are in `DatabaseDesign.md`'s field table but no endpoint ever exposes them — left off the model. `Get Task` doesn't return `comments`/`attachments` — those collections are M6 (Collaboration), not built.
Exit Criteria
•	✅ All endpoints implemented, validated (Zod), authorized (`requireAuth` + `requireProjectRole`/`requireTaskRole`), and covered by integration tests (11 tests in `tests/tasks.test.ts`, run against the real dev MongoDB Atlas cluster)
•	✅ `pnpm typecheck`, `pnpm build`, `pnpm test` all pass (63 tests total, stable across repeated runs)
•	✅ `Docs/DatabaseDesign.md` and `Docs/ApiSpecifications.md` updated (restore semantics, archived-read-only, dropped fields, M6 gaps on Get Task all spelled out); `server/src/docs/openapi.ts` updated to match
•	✅ Manually verified end-to-end against a live dev server: create org → workspace (+ member) → project → label → task (with label) → subtask (parentTaskId auto-set) → assign (workspace-membership check, and its rejection) → get (labels + subtasks populated) → status → DONE (completedAt set) → delete → 404 → restore → visible again
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
•	✅ Authentication UI (register/verify/login/forgot-reset password, all against the existing `api/auth.ts` — no backend changes needed, that layer was already complete from M0)
•	✅ Organization UI (list/create, members incl. invite + role update, settings incl. delete, pending-invitations panel on the org list)
•	✅ Workspace UI (list/create, members roster incl. add/remove, settings incl. archive/delete)
•	✅ Project UI (paginated list/create, labels, settings incl. status transitions)
•	✅ Task UI (paginated + filtered list, full detail page — inline status/priority/assignee/due-date/labels editing, subtasks, delete)
•	⬜ Dashboard UI — deferred with M8 (Dashboard & Search), which hasn't been built; nothing to consume yet
•	⬜ Search UI — same, deferred with M8
Architecture: nested layouts (`OrganizationLayout` → `WorkspaceLayout` → `ProjectLayout`) each fetch exactly their own resource + role and pass it down via `useOutletContext`, mirroring the backend's own `requireOrganizationRole`/`requireWorkspaceRole`/`requireProjectRole` layering. Every create/action button is role-gated client-side to match the backend's exact role matrix (`lib/permissions.ts`) — not just for UX, it keeps the UI from ever offering an action that would 403.
Known gap (flagged, not silently dropped): restoring a soft-deleted task isn't reachable from the UI — there's no "list deleted tasks" endpoint to surface a restore action from (`PATCH { isDeleted: false }` exists API-side but nothing points the UI at a deleted task's id). Add a restore UI affordance if/when that endpoint exists.
Bug found and fixed during manual verification: the pending-invitations panel's "Accept" button called `acceptOrganizationInvitation(invitation._id)`, but the backend's accept endpoint requires the invitation's raw token (recoverable only from the invite email/log — only its hash is ever stored server-side), not its id. There is no accept-by-id endpoint (only decline works that way). Fixed by removing the broken Accept button and pointing users at the emailed link instead (`/invitations/accept?token=...`, which already worked correctly) — caught by driving the real app in a browser, not by `tsc`/`eslint`, which is exactly why that verification step exists for UI milestones.
Exit Criteria
•	✅ `pnpm build` and `pnpm lint` pass clean in `client/`
•	✅ Manually verified end-to-end in a real browser (Claude-in-Chrome): register → verify → login → create org → create workspace (auto-added as its member) → create project (key auto-uppercased) → create label → create task (assigned, labeled) → create subtask → status → DONE → invite a second user → accept via the real emailed link → confirm MEMBER-role role-gating (no create buttons, no Settings tabs, full read access) — all end-to-end through the actual UI, not just API calls
•	🟡 Dashboard UI / Search UI not built — deferred with M8, tracked above, not silently dropped
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
M4 → M5 → M9 sequence is complete: TaskFlow is now a usable local app end-to-end (register → org → workspace → project → task, real UI, manually verified in a browser). Not yet decided: M6/M7/M8 (Collaboration/Notifications/Dashboard & Search) vs. M10 (Testing & Quality) next — ask before starting either.
Sequencing decision (2026-09-21, completed 2026-09-21): built M4 → M5 → M9, deferring M6 (Collaboration), M7 (Notifications), M8 (Dashboard & Search) until after a usable local app existed end-to-end. That goal is now met.
Key Decisions Carried From M2–M5 (apply to M9 and onward)
•	Repository layer is mandatory (server/src/modules/*/*.repository.ts) — controllers/services never touch Mongoose models directly, per Docs/Rules.md §5.
•	Tenant isolation rule: every M2+ query must filter by organizationId; there is no cross-org access, ever.
•	`requireAuth` (M1) gives `req.userId`; every access check composes on top of it via the shared `resolveOrganizationAccess` helper (`organizations/organization.middleware.ts`) — `requireOrganizationRole` (M2), `requireWorkspaceRole` (M3), `requireProjectRole` (M4), and `requireTaskRole` (M5) all call it rather than re-checking membership ad hoc, each deriving `organizationId` from its own resource. This is the pattern any new M6+ resource-scoped route should follow.
•	No multi-document Mongo transactions: this Atlas tier doesn't support retryable-write transactions. Multi-write operations use sequential writes with manual compensation (`organization.service.ts`'s `createOrganization`, `workspace.service.ts`'s `createWorkspace`) instead.
•	Sub-resource membership (M3's `WorkspaceMember`) is a roster, not a role table — permissions still resolve through the parent organization's role. Project/Label (M4) and Task (M5) skipped a membership collection entirely since nothing needed one; M5 did give `WorkspaceMember` its first real *validation* consumer though (a task's `assigneeId` must be a workspace member) — the roster isn't just a display list any more.
•	"Archived → read-only for mutation, but delete/removal still allowed" is now a 3x-repeated pattern (Workspace, Project, Task) — `assertNotArchived`-style guards, one per service file, not shared, since exact conditions differ slightly per resource.
•	Pagination (`validateQuery` + `sendSuccessResponse`'s `meta`, from M4) now has two consumers (Project, Task) with Task's list carrying more filters — this is the settled pattern for any future paginated list.
•	M5 established a real exception to "deleted = filtered out by the middleware": Task's restore-via-`PATCH` needs the middleware to resolve a soft-deleted resource, so the deleted-is-404 check moved into the service/controller layer instead for that one module. Every other module still filters at the middleware/repository level — don't generalize this unless a future resource actually needs undelete-via-update too.
•	M9 is frontend work against `client/` (Vite + React 19 + TypeScript, Tailwind v4, React Router, TanStack Query, Axios, RHF + Zod — see M0). It consumes the M1–M5 APIs as they exist today; no backend changes expected unless the UI surfaces a real gap.
Completed
•	[x] M1 — Authentication (see above)
•	[x] M2 — Organizations (see above)
•	[x] M3 — Workspaces (see above)
•	[x] M4 — Projects (see above)
•	[x] M5 — Tasks (see above)
•	[x] M9 — Frontend Integration, Auth/Org/Workspace/Project/Task UI (see above; Dashboard/Search UI still pending M8)
Blockers
•	None
________________________________________
Technical Debt
Priority	Item	Status
High	~~typescript-eslint@8.66.0 does not support typescript@7.0.2 — `pnpm lint` fails to even load the config.~~ Fixed 2026-09-21: pinned `typescript` to `^6.0.3` (the newest line `typescript-eslint@8.66.0`'s peer range allows), added `dist/**` to eslint ignores, and switched `globals.browser` → `globals.node` (this is a Node backend — that mismatch was hiding real `no-undef` errors on `process`). `pnpm lint` passes clean.	Resolved
Medium	Empty placeholder folders under server/src (controllers/, respositories/, services/, types/, validators/, constants/) left over from before the modules/ pattern was adopted — safe to delete.	Open
Medium	~~No real email provider configured.~~ Fixed 2026-09-21: `utils/mailer.ts` now goes through `nodemailer`. Without `SMTP_HOST` set it falls back to `jsonTransport` (same log-only behavior as before); setting `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`/`MAIL_FROM` switches to real delivery with no call-site changes.	Resolved
Low	~~Refresh-token rate limit (60/user/hour per spec) is currently keyed by IP, not by user.~~ Fixed 2026-09-21: `refreshLimiter` now has a `keyGenerator` that decodes (unverified — real verification still happens in the service layer) the refresh-token cookie for `userId`, falling back to IP only when the cookie's missing or undecodable.	Resolved
Low	~~`revokeAllSessionsForUser` uses Redis `KEYS`.~~ Fixed 2026-09-21: switched to `redisClient.scanStream`.	Resolved
Low	~~No decline-invitation or list-pending-invitations endpoints.~~ Fixed 2026-09-21: added `GET /organizations/invitations/pending` and `POST /organizations/invitations/{id}/decline` (both extend beyond `Docs/ApiSpecifications.md`'s original list — spec updated to match). Invite expiry shortened from 7 to 5 days at the same time.	Resolved
Low	Deleting an organization doesn't touch its `OrganizationMember` rows (matches `Docs/DatabaseDesign.md`'s cascade rules exactly — membership isn't listed there). They become orphaned but harmless since `requireOrganizationRole` looks up the organization first and 404s on a deleted one.	Open
Low	~~Org deletion doesn't revoke members' sessions.~~ Fixed 2026-09-21, as a middle ground rather than full org-scoped sessions (which would require an org-selection step at login — out of scope): the access token now carries `sessionId`; `requireOrganizationRole` records which orgs a session has touched in a Redis set (`session:orgs:{userId}:{sessionId}`); on org deletion, a member's session is revoked only if that org was the *only* one it had tracked access to (fail-open — an untracked/missing set is left alone). See `session.repository.ts`'s `recordSessionOrgAccess`/`revokeSessionsForOrganization`.	Resolved
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

