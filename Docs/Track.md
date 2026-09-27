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
M6 - Collaboration	✅	100%
M7 - Notifications	✅	100%
M8 - Dashboard & Search	✅	100%
M9 - Frontend Integration	✅	100%
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
•	✅ Comments (`/api/v1/tasks/:taskId/comments`, create/list-paginated/update/soft-delete; `mentionedUserIds` must all be members of the task's organization — an unvalidated mention would let any member push a notification at any account; edit/delete allowed for the comment's author or an ADMIN/OWNER, enforced in the service since the check needs the comment itself, with the route only gating "can write at all")
•	✅ Attachments (`/api/v1/tasks/:taskId/attachments`, multer `memoryStorage` → `utils/storage.ts`; fixed MIME allowlist, `MAX_UPLOAD_BYTES` cap (default 10MB), MulterError translated to a 422 so it isn't flattened to a 500; only metadata in Mongo, never binaries; delete soft-deletes the metadata row for audit and permanently removes the stored asset)
•	✅ Cloudinary Integration (`utils/storage.ts` — env-gated exactly like `utils/mailer.ts`: Cloudinary when `CLOUDINARY_CLOUD_NAME` is set, otherwise writes under `UPLOAD_DIR` and serves from `/uploads` via `express.static`. Call sites never change. No Cloudinary account is configured yet, so the local path is what runs today — see Technical Debt)
•	✅ Activity Timeline (`GET /api/v1/tasks/:taskId/activities`) — this is a **read** endpoint over the `TaskActivity` collection M5 had been writing to since it was introduced; nothing had ever read it. Comment and attachment events now write to it too.
•	✅ `AuditLog`/`TaskActivity` events: COMMENT_CREATED/UPDATED/DELETED, ATTACHMENT_UPLOADED/DELETED
Routing note: mounted at `/api/v1/tasks/:taskId/...` per `Docs/ApiSpecifications.md` Part 5, even though the task module itself lives under `/projects/:projectId/tasks`. This works unchanged because `requireTaskRole` only cross-checks `:projectId` when the URL actually carries one.
Exit Criteria
•	✅ All endpoints implemented, validated (Zod), authorized (`requireAuth` + `requireTaskRole`), and covered by integration tests (10 tests in `tests/collaboration.test.ts`)
•	✅ `pnpm typecheck`, `pnpm build`, `pnpm lint`, `pnpm test` all pass (73 tests total at this point)
________________________________________
M7 — Notifications
•	✅ Notification APIs (`/api/v1/notifications`: list with `?page`/`?limit`/`?isRead`/`?type` and an `unreadCount` in `meta`, mark-read, mark-all-read, soft-delete). **The only module with no organization role check** — a notification belongs to a person, so `requireAuth`'s `userId` is the entire authorization story and every query filters on it. `PATCH /read-all` is registered before `PATCH /:notificationId` or "read-all" would be matched as an id.
•	✅ BullMQ (`notifications/notification.queue.ts`) on the existing Redis, but with its own `ioredis` connection — BullMQ blocks on BRPOPLPUSH and requires `maxRetriesPerRequest: null`, so it cannot share `database/redis.ts`'s client. Worker runs in-process, started from `server.ts`. A notification that can't be enqueued is logged and swallowed: the task/comment write has already succeeded and must not fail because of it.
•	✅ Email Notifications (the worker writes the in-app row then optionally mails the same title/message through the existing `utils/mailer.ts`; in-app-only is the default — mentions and assignments get an email, a comment on a task you merely own does not)
•	✅ Reminder Jobs (hourly repeatable job via `upsertJobScheduler`, sweeping tasks due within 24h that are assigned and not DONE/ARCHIVED). Deliberately re-derived from the Task collection each run rather than scheduling a delayed job per task at write time: a `dueDate` can change or be cleared any number of times, and a standing per-task job would then have to be found and cancelled. Idempotent via a `metadata.taskId` + `metadata.dueDate` existence check, so the hourly sweep never duplicates a reminder.
•	✅ Producers wired into the existing services rather than bolted on: task assigned/updated/completed (M5), comment added incl. mentions (M6), invitation sent/accepted (M2), project archived (M4). All copy lives in one `notification.events.ts`; nobody is ever notified of their own action, and a recipient who appears twice (assignee who is also the reporter) gets one notification.
Testing note: under `NODE_ENV=test` `enqueueNotification` dispatches inline instead of queueing, so tests assert on the resulting `Notification` document directly rather than racing a background consumer. The real worker path was verified separately against a running dev server (see Exit Criteria).
Scope note: `INVITATION_SENT` only produces an in-app notification when the invitee already has an account — a notification needs a `userId`, and an invite may go to a stranger. The invitation email reaches everyone else.
Exit Criteria
•	✅ All endpoints implemented, validated (Zod), covered by integration tests (12 tests in `tests/notifications.test.ts`)
•	✅ `pnpm typecheck`, `pnpm build`, `pnpm lint`, `pnpm test` all pass (85 tests total at this point)
•	✅ Verified against a live dev server with the real BullMQ worker running (not the inline test path): assigning a task and mentioning someone in a comment both produced the expected `TASK_ASSIGNED`/`COMMENT_ADDED` notifications asynchronously, with a correct `unreadCount`, and mark-all-read cleared them
________________________________________
M8 — Dashboard & Search
•	✅ Dashboard APIs (`/api/v1/dashboard`, read-only): `GET /summary` and `GET /productivity` are **personal** (scoped to the caller inside one org, so they take `?organizationId`); `GET /workspaces/:workspaceId` and `GET /projects/:projectId` borrow their resource's existing role check.
•	✅ Analytics (Mongo aggregation, not app-side counting): per-project progress for a workspace comes from one `$group` over its tasks rather than 2N count queries; project dashboard groups by status and priority; productivity averages wall-clock hours from creation to completion and buckets completions by ISO week (`%G-W%V`, so weeks don't split oddly across a year boundary).
•	✅ Search APIs (`/api/v1/search`, `/search/tasks`, `/search/projects`) on **Mongo `$text` indexes** — a native platform feature rather than a regex scan. One text index per collection, so Task's covers title+description and Project's covers name+key+description, with weights so a title hit outranks a passing mention in the body. Results sort by `textScore` when there's a query and newest-first otherwise. Users are the exception: they're global documents, so their org scope comes from `OrganizationMember` and matching is a bounded case-insensitive regex — a text index there would index every tenant's users into one global index.
•	✅ Redis Cache (`utils/cache.ts`, ~40 lines, no cache library — `SETEX` plus JSON is the whole job). Dashboard endpoints only, 60s TTL, and **the TTL is the entire invalidation strategy** — nothing invalidates explicitly. Every path fails open: a Redis outage degrades the dashboard to "slow", never to "broken". Invalidation-by-prefix uses `scanStream`, never `KEYS`, matching the rule `session.repository.ts` already follows.
•	✅ Tenant isolation: every search function takes `organizationId` as its first argument and puts it in the filter; `requireOrganizationAccessFromQuery` proves membership before any query is built. There is no cross-org search, ever.
Refactor (a net deletion): M3's `requireOrganizationAccessForWorkspaceList` did exactly the job the dashboard and search routes needed — resolve the tenant from `?organizationId` when there's no `:organizationId` param to derive it from. Generalised into `requireOrganizationAccessFromQuery` in `organizations/organization.middleware.ts` (now role-aware), workspace routes switched to it, and the workspace-specific copy deleted rather than leaving two near-identical middlewares.
Exit Criteria
•	✅ All endpoints implemented, validated (Zod — `validateQuery` runs before the access check so a missing `organizationId` is a 422 rather than a 400 from inside the access helper), and covered by integration tests (14 tests in `tests/dashboard.search.test.ts`, including a cross-tenant rejection and a check that password hashes never leave the users collection)
•	✅ `pnpm typecheck`, `pnpm build`, `pnpm lint`, `pnpm test` all pass (99 tests total)
•	✅ Verified against a live dev server: every dashboard endpoint, a cache hit on the second call, global search finding both a task and a project, a filtered task search, and a 403 for a non-member
________________________________________
M9 — Frontend
•	✅ Authentication UI (register/verify/login/forgot-reset password, all against the existing `api/auth.ts` — no backend changes needed, that layer was already complete from M0)
•	✅ Organization UI (list/create, members incl. invite + role update, settings incl. delete, pending-invitations panel on the org list)
•	✅ Workspace UI (list/create, members roster incl. add/remove, settings incl. archive/delete)
•	✅ Project UI (paginated list/create, labels, settings incl. status transitions)
•	✅ Task UI (paginated + filtered list, full detail page — inline status/priority/assignee/due-date/labels editing, subtasks, delete)
•	✅ Dashboard UI — built with M8 (no longer deferred): an org-level tab (personal summary KPI tiles + productivity, incl. a per-week completion chart), a workspace tab (per-project progress meters, completion rate, active members, team activity) and a project tab (totals, progress meter, status/priority breakdown).
•	✅ Search UI — built with M8 (no longer deferred): an org-level Search tab with a type filter (All/Tasks/Projects/Workspaces/People), deep-linking into projects and workspaces.
•	✅ Collaboration UI — added with M6: comments (author-or-admin inline edit/delete), attachments (upload, size/uploader, delete) and the read-only activity timeline, all on the task detail page.
•	✅ Notification UI — added with M7: an unread-badged bell in `AppShell` with a recent dropdown and mark-all-read, plus a full `/notifications` page with read/type filters, a per-item read toggle, delete and pagination. The bell polls every 60s — notifications are written out-of-band by a worker, and Socket.IO is v1.1 scope.
Dataviz note: dashboard numbers are stat tiles and meters rather than charts (a one-bar bar chart is the wrong form for a single value), the one time series is a single-hue column chart with values on hover, and status/priority breakdowns are single-hue labelled bar lists — so no categorical palette was introduced and identity never rests on colour alone.
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
M6 → M7 → M8 are complete, backend **and** UI, which also closes M9 (its Dashboard/Search UI had been explicitly deferred with M8). Every feature milestone M1–M9 is now done and 99 integration tests pass. Next up is M10 (Testing & Quality) — ask before starting it.
Sequencing decision (2026-09-28, completed 2026-09-28): built M6 → M7 → M8 with each milestone's UI shipped alongside its own backend, rather than batching all UI into one milestone as M9 did. Each milestone was gated on `pnpm typecheck`/`build`/`lint`/`test` plus a live dev-server check before the next one started.
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
•	External providers are env-gated with a working local fallback, never a hard dependency: `utils/mailer.ts` (SMTP → nodemailer `jsonTransport`) and now `utils/storage.ts` (Cloudinary → local `UPLOAD_DIR`). Call sites never branch on which one is active. Any future provider should follow this shape.
•	Notifications are the one user-scoped module — no `requireOrganizationRole` anywhere in it, because a notification belongs to a person rather than to an org membership. `requireAuth`'s `userId` is the whole authorization check, and every query filters on it. Don't generalise the org-role pattern onto it.
•	Background work goes through BullMQ on the existing Redis, with its own `ioredis` connection (`maxRetriesPerRequest: null` — it cannot share `database/redis.ts`'s client). Producers enqueue and never fail the request if the queue is down; the worker runs in-process and is a no-op under `NODE_ENV=test`, where jobs dispatch inline so tests don't race a consumer.
•	Caching is `utils/cache.ts` (`SETEX` + JSON, no cache library), applied to dashboard reads only, with the 60s TTL as the entire invalidation strategy. Every path fails open — Redis being down must degrade a feature to slow, never to broken. Prefix invalidation uses `scanStream`, never `KEYS`.
•	Search uses Mongo `$text` indexes (one per collection, weighted), not regex scans — except `User`, which is a global document whose org scope comes from `OrganizationMember` instead. Every search function takes `organizationId` first and filters on it; `requireOrganizationAccessFromQuery` proves membership before a query is built.
•	When a route has no `:organizationId` param to derive the tenant from, use the shared `requireOrganizationAccessFromQuery` (`organizations/organization.middleware.ts`) with `validateQuery` in front of it, so a missing `organizationId` is a 422 rather than a 400 from inside the access helper. M3's workspace-specific copy of this was folded into it.
Completed
•	[x] M1 — Authentication (see above)
•	[x] M2 — Organizations (see above)
•	[x] M3 — Workspaces (see above)
•	[x] M4 — Projects (see above)
•	[x] M5 — Tasks (see above)
•	[x] M6 — Collaboration (see above)
•	[x] M7 — Notifications (see above)
•	[x] M8 — Dashboard & Search (see above)
•	[x] M9 — Frontend Integration, complete: Auth/Org/Workspace/Project/Task UI, plus the Collaboration (M6), Notification (M7) and Dashboard/Search (M8) UI
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
Medium	No Cloudinary account configured, so `utils/storage.ts` writes attachments to local disk under `UPLOAD_DIR` and serves them from `/uploads` via `express.static`. Those URLs are unguessable (uuid filenames) but **not access-controlled** — anyone with the link can fetch the file, with no org-membership check. Set `CLOUDINARY_CLOUD_NAME`/`CLOUDINARY_API_KEY`/`CLOUDINARY_API_SECRET` to switch to Cloudinary (no call-site changes), or put a signed-URL proxy in front, before this is exposed publicly. Marked with a `ponytail:` comment in `utils/storage.ts`.	Open
Low	The BullMQ worker runs in the API process (`startNotificationWorker()` from `server.ts`), so the hourly due-date sweep competes with request handling and doesn't scale past one node. Fine at current volume; move it to its own container if the sweep grows. Marked with a `ponytail:` comment in `notification.queue.ts`.	Open
Low	Notification metadata carries `taskId`/`projectId` but not `workspaceId`, and the task detail route needs org + workspace + project + task, so notifications are not deep-linked in the UI — the bell and `/notifications` page show text only. Adding `workspaceId` to the producers would cost an extra project read per notification; do it if deep links are wanted.	Open
Low	`msgpackr-extract` (an optional native accelerator behind bullmq's msgpackr) is set to `false` in `server/pnpm-workspace.yaml`'s `allowBuilds`, so its build script never runs and msgpackr falls back to pure JS. Flip it to `true` if queue serialisation ever shows up in a profile.	Open
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

