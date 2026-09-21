05-database-design.md
Database Design
Project: TaskFlow
Architecture: Multi-Tenant SaaS
Database: MongoDB Atlas
ODM: Mongoose
Version: 1.0
________________________________________
Table of Contents
1.	Introduction
2.	Database Design Principles
3.	Base Entity Pattern
4.	Multi-Tenant Data Isolation Strategy
5.	Soft Delete Strategy
6.	Naming Conventions
7.	ID Strategy
8.	Timestamp Strategy
9.	Audit Strategy
10.	Indexing Strategy
11.	Transaction Strategy
12.	Entity Relationship Diagram (ERD)
13.	Collection Design
14.	Relationships
15.	Query Patterns
________________________________________
1. Introduction
The database is the foundation of TaskFlow. It is designed to support a production-grade multi-tenant SaaS application with a strong emphasis on scalability, maintainability, security, and performance.
Rather than treating MongoDB as a simple document store, this design follows structured engineering practices commonly used in enterprise applications. Every collection, relationship, and indexing strategy is planned to support future growth without requiring major schema redesigns.
The primary goals of the database design are:
•	Ensure complete tenant isolation.
•	Maintain data consistency.
•	Support efficient querying.
•	Enable auditing and traceability.
•	Simplify future feature development.
•	Minimize schema changes as the application evolves.
________________________________________
2. Database Design Principles
The following principles apply to every collection and database operation throughout TaskFlow.
________________________________________
2.1 Multi-Tenant First
TaskFlow is a multi-tenant application.
Organizations share the same database but never share data.
Every business entity belongs to an organization either:
•	Directly
•	Indirectly through its parent entity
Example
Organization
    │
Workspace
    │
Project
    │
Task
    │
Comment
Every database query must execute within an organization context.
Cross-organization access is never permitted.
________________________________________
2.2 Consistency Over Convenience
The database favors consistent modeling over short-term convenience.
Relationships will be modeled explicitly rather than duplicating large amounts of data.
Example
Instead of embedding all tasks inside a project document:
{
  "tasks": [...]
}
Tasks are stored in their own collection and referenced by projectId.
Benefits:
•	Better scalability
•	Smaller document size
•	Easier pagination
•	Cleaner indexing
•	Independent lifecycle management
________________________________________
2.3 Predictable Data Structures
Collections should follow a consistent structure.
Developers should immediately recognize:
•	ownership
•	timestamps
•	status
•	soft deletion
•	audit information
Consistency reduces bugs and simplifies maintenance.
________________________________________
2.4 Separation of Concerns
Collections represent independent business entities.
For example:
•	Users
•	Organizations
•	Projects
•	Tasks
•	Comments
Each collection owns only the data that belongs to it.
Business logic belongs in the application layer, not in the database schema.
________________________________________
2.5 Normalization with Practical Denormalization
MongoDB is a document database, but excessive embedding can make updates and queries difficult.
TaskFlow follows these guidelines:
Normalize:
•	Users
•	Organizations
•	Tasks
•	Projects
•	Memberships
•	Sessions
Embed only when:
•	Data is small
•	Data is tightly coupled
•	Data rarely changes
•	Reads significantly outnumber writes
This balances performance with maintainability.
________________________________________
2.6 Security by Design
Security is part of the database design rather than an afterthought.
Sensitive information is never stored in plain text.
Examples:
•	Passwords are hashed.
•	Tokens are hashed where appropriate.
•	Secrets are stored in environment variables.
•	Internal identifiers are never exposed unnecessarily.
________________________________________
2.7 Auditability
Every important action should be traceable.
The system should always be able to answer questions such as:
•	Who created this task?
•	Who updated this project?
•	When was this workspace archived?
•	Who deleted this comment?
Auditability is mandatory for production SaaS applications.
________________________________________
2.8 Scalability
Collections must support:
•	Millions of tasks
•	Thousands of organizations
•	Large workspaces
•	High request volumes
Design decisions should avoid future bottlenecks.
________________________________________
2.9 Performance
Database queries should:
•	Use indexes effectively.
•	Avoid unnecessary joins.
•	Minimize full collection scans.
•	Support pagination.
•	Return only required fields.
Performance should be considered during schema design, not after deployment.
________________________________________
2.10 Maintainability
The schema should be:
•	Easy to understand
•	Easy to extend
•	Backward compatible where possible
•	Consistent across collections
Future developers should understand the database without extensive documentation.
________________________________________
3. Base Entity Pattern
Purpose
Most collections in TaskFlow require the same set of metadata:
•	Creation information
•	Update information
•	Ownership
•	Soft deletion state
•	Audit details
Rather than redefining these fields in every schema, TaskFlow adopts a Base Entity Pattern.
This is not object-oriented inheritance.
Instead, it is a design contract that every business collection follows.
Every business entity must expose the same metadata structure, regardless of its domain.
This provides:
•	Consistent CRUD operations
•	Standard audit information
•	Reusable repository methods
•	Generic service implementations
•	Uniform API responses
•	Easier debugging
•	Easier testing
________________________________________
Standard Base Entity Fields
Every business entity should include the following metadata fields.
Field	Type	Description
_id	ObjectId	Unique identifier
createdAt	Date	Creation timestamp
updatedAt	Date	Last modification timestamp
createdBy	ObjectId	User who created the record
updatedBy	ObjectId	User who last updated the record
isDeleted	Boolean	Soft delete flag
deletedAt	Date | null	Soft deletion timestamp
deletedBy	ObjectId | null	User who performed the deletion
________________________________________
Tenant-Aware Entities
Most business entities are scoped to an organization.
These entities should also include:
Field	Type	Description
organizationId	ObjectId	Owning organization
Examples include:
•	Workspaces
•	Projects
•	Tasks
•	Labels
•	Invitations
•	Notifications
•	Audit Logs
Some entities, such as User, are global and therefore do not include organizationId.
________________________________________
Benefits of the Base Entity Pattern
Consistency
Every collection behaves the same way.
________________________________________
Auditability
Every record records who created, modified, or deleted it.
________________________________________
Soft Delete Support
Deleted records remain recoverable until permanently removed by system policies.
________________________________________
Generic Repository Methods
Repository implementations can share common CRUD behavior because all entities expose the same lifecycle metadata.
________________________________________
Easier API Design
Clients can rely on consistent metadata being returned for every business resource.
________________________________________
Simpler Maintenance
Adding a new collection does not require inventing new audit conventions; it simply adopts the existing contract.
________________________________________
Exceptions
Not every collection should implement the full Base Entity contract.
Examples include:
•	Session
•	Refresh Token
•	Verification Token
•	Password Reset Token
These are short-lived system entities with a limited lifecycle and should contain only the metadata required for their specific purpose.
________________________________________
Design Guideline
Before introducing a new collection, ask:
"Does this represent a business entity with a lifecycle?"
If the answer is yes, the collection should implement the Base Entity Pattern.
If the answer is no, it should remain a lightweight system collection with only the fields necessary for its operation.

12. Entity Relationship Diagram (ERD)
TaskFlow follows a hierarchical multi-tenant architecture where every business resource belongs to an organization either directly or indirectly.
The following diagram represents the logical relationship between all primary entities.
                                   USER
                                     │
                ┌────────────────────┴────────────────────┐
                │                                         │
        ORGANIZATION MEMBER                     SESSION
                │
                │
        ORGANIZATION
                │
        ┌───────┴────────┐
        │                │
   WORKSPACE         INVITATION
        │
        │
 PROJECT MEMBER
        │
        │
     PROJECT
        │
        │
      TASK
        │
 ┌──────┼──────────────┬──────────────┐
 │      │              │              │
 │  TASK COMMENT   TASK ATTACHMENT  TASK ACTIVITY
 │
 │
 LABEL
 │
 NOTIFICATION
 │
 AUDIT LOG
________________________________________
Relationship Summary
Parent	Child	Relationship
User	OrganizationMember	One-to-Many
Organization	OrganizationMember	One-to-Many
Organization	Workspace	One-to-Many
Workspace	Project	One-to-Many
Project	Task	One-to-Many
Task	SubTask	One-to-Many (Self Reference)
Task	Comment	One-to-Many
Task	Attachment	One-to-Many
Task	Activity	One-to-Many
User	Session	One-to-Many
User	Notification	One-to-Many
________________________________________
Collection Categories
TaskFlow separates collections into three categories.
1. Core Business Collections
These collections represent the primary business domain.
•	Users
•	Organizations
•	OrganizationMembers
•	Workspaces
•	WorkspaceMembers
•	Projects
•	Tasks
________________________________________
2. Collaboration Collections
These collections support collaboration.
•	TaskComments
•	TaskAttachments
•	TaskActivities
•	Labels
•	Notifications
•	Invitations
________________________________________
3. System Collections
Infrastructure collections.
•	Sessions
•	AuditLogs
________________________________________
Core Collections
1. Users
Purpose
Stores global user accounts.
A user exists independently of any organization and may belong to multiple organizations simultaneously.
Examples:
•	John may belong to Company A.
•	John may also belong to Company B.
The User collection contains only identity information.
Authorization is handled through OrganizationMember.
________________________________________
Responsibilities
•	Authentication
•	Profile information
•	Email verification
•	Account status
•	Global preferences
________________________________________
Relationships
User

├── OrganizationMembers

├── Sessions

├── Notifications

├── AuditLogs (createdBy)

├── Tasks (createdBy)

├── Comments (createdBy)

└── Attachments (uploadedBy)
________________________________________
2. Organizations
Purpose
Represents a company or tenant using TaskFlow.
Every organization is fully isolated from every other organization.
Examples:
•	Microsoft
•	OpenAI
•	Acme Solutions
________________________________________
Responsibilities
•	Organization settings
•	Organization branding (future)
•	Subscription (future)
•	Member management
•	Workspace management
________________________________________
Relationships
Organization

├── OrganizationMembers

├── Workspaces

├── Invitations

└── AuditLogs
________________________________________
3. OrganizationMembers
Purpose
Represents the relationship between a User and an Organization.
This collection stores:
•	Membership
•	Organization Role
•	Invitation status
•	Join date
•	Membership status
This is the foundation of the RBAC system.
________________________________________
Why Separate Collection?
Instead of:
Organization

{
   members: [...]
}
TaskFlow uses:
User

↓

OrganizationMember

↓

Organization
Benefits
•	Better indexing
•	Cleaner permissions
•	Easy role updates
•	Supports large organizations
•	Easier auditing
________________________________________
Relationships
OrganizationMember

├── User

└── Organization
________________________________________
4. Workspaces
Purpose
Represents departments or major work areas inside an organization.
Examples
Engineering
Marketing
Finance
Customer Success
________________________________________
Responsibilities
•	Organize projects
•	Workspace settings
•	Workspace permissions
•	Workspace analytics
________________________________________
Relationships
Workspace

├── Organization

├── Members

├── Projects

└── AuditLogs
________________________________________
5. WorkspaceMembers
Purpose
Represents the team working together inside a specific workspace — who is actively assigned to it, distinct from being a member of the parent organization.
________________________________________
Responsibilities
•	Track which users work in a workspace
•	Support per-workspace rosters for future task assignment (Projects, Tasks)
________________________________________
Relationships
WorkspaceMember

├── User

├── Workspace

└── Organization
________________________________________
Why Separate Collection?
Same reasoning as OrganizationMembers: a workspace's roster is queried and updated independently of the workspace document itself, and a user's workspace memberships are queried independently of any single workspace.
________________________________________
Business Rules
•	A user must already be a member of the parent organization to be added to one of its workspaces.
•	Permissions are not stored here — CRUD access to a workspace and its roster is governed by the caller's OrganizationMember role, resolved through the workspace's organizationId. WorkspaceMember is a roster, not a role table.
•	Adding members to an archived workspace is rejected; removing them is still allowed.
________________________________________
6. Projects
Purpose
A project groups related tasks.
Examples
Authentication System
Website Redesign
Marketing Campaign
Mobile Application
________________________________________
Responsibilities
•	Organize work
•	Track progress
•	Manage project members
•	Report project status
________________________________________
Relationships
Project

├── Workspace

├── Tasks

└── AuditLogs
________________________________________
7. Tasks
Purpose
Represents the smallest unit of work.
Every task belongs to exactly one project.
Tasks support:
•	Assignment
•	Priorities
•	Due Dates
•	Attachments
•	Comments
•	Activity Tracking
•	Labels
________________________________________
Self Relationship
Tasks support subtasks.
Task

├── SubTask

├── SubTask

└── SubTask
Each subtask references its parent using:
parentTaskId
If the field is null, the task is a root task.
________________________________________
Relationships
Task

├── Project

├── Parent Task

├── Child Tasks

├── Comments

├── Attachments

├── Activities

└── Labels
________________________________________
Tenant Ownership
The following collections are tenant-aware and must include an organizationId reference.
•	OrganizationMembers
•	Workspaces
•	WorkspaceMembers
•	Projects
•	Tasks
•	TaskComments
•	TaskAttachments
•	TaskActivities
•	Labels
•	Invitations
•	Notifications
•	AuditLogs
The following collections are global and must not include an organizationId.
•	Users
•	Sessions
________________________________________
Design Decisions
Multi-Tenant Isolation
Every business query must execute within an organization context.
Cross-organization access is prohibited.
________________________________________
Membership-Based Authorization
Roles are stored in OrganizationMembers, not in Users.
This allows a single user to have different roles across different organizations.
________________________________________
Self-Referencing Tasks
Subtasks are implemented using a parentTaskId reference rather than a separate SubTask collection.
This keeps the schema simple while supporting unlimited task hierarchies.
________________________________________
Normalized Relationships
Core business entities are stored in separate collections and connected through references.
Embedding is reserved only for small, tightly coupled, and rarely changing data.

Project Collections
________________________________________
1. Projects Collection
Purpose
The Projects collection represents a logical container of work within a workspace.
Projects group related tasks together and provide visibility into progress, ownership, and collaboration.
Examples:
Engineering Workspace
•	Authentication Service
•	User Management
•	Payment Gateway
Marketing Workspace
•	Product Launch
•	Social Media Campaign
•	SEO Improvements
________________________________________
Responsibilities
The Projects collection is responsible for:
•	Organizing tasks
•	Tracking project progress
•	Defining project lifecycle
•	Managing project settings
•	Storing project metadata
•	Reporting project statistics
________________________________________
Lifecycle
Created

↓

Planning

↓

Active

↓

On Hold

↓

Completed

↓

Archived
Archived projects remain searchable but are read-only.
________________________________________
Fields
Base Entity
•	_id
•	createdAt
•	updatedAt
•	createdBy
•	updatedBy
•	isDeleted
•	deletedAt
•	deletedBy
•	organizationId
________________________________________
Business Fields
Field	Type	Required	Description
workspaceId	ObjectId	Yes	Parent workspace
name	String	Yes	Project name
key	String	Yes	Short identifier (AUTH, WEB, API)
description	String	No	Project description
status	Enum	Yes	Current project status
startDate	Date	No	Planned start
endDate	Date	No	Planned completion
archivedAt	Date	No	Archive timestamp
________________________________________
Status Enum
PLANNING

ACTIVE

ON_HOLD

COMPLETED

ARCHIVED
________________________________________
Indexes
Unique
organizationId + workspaceId + key
Indexes
•	workspaceId
•	organizationId
•	status
•	createdAt
•	updatedAt
________________________________________
Relationships
Workspace

↓

Project

↓

Tasks

↓

Comments

↓

Attachments
________________________________________
Business Rules
•	Every project belongs to exactly one workspace.
•	Project names are unique within a workspace (application-level check, not a DB index — only `key` has a unique compound index; see Indexes).
•	Archived projects cannot receive new tasks; archived projects also reject further edits through Update (read-only, per Lifecycle above) — deletion is still allowed.
•	Deleting a workspace archives its projects (once Projects exist to cascade to — implemented as of M4; the workspace-deletion side of this cascade isn't built, see Track.md M3's technical debt).
•	Projects are soft deleted.
________________________________________
Common Queries
•	Get workspace projects
•	Get active projects
•	Search projects
•	Project dashboard
•	Project statistics
________________________________________
2. Labels Collection
Purpose
Stores reusable labels for a project.
Tasks reference labels instead of creating duplicate values.
Example
Backend

Frontend

Bug

Feature

Research

Urgent
________________________________________
Responsibilities
•	Label management
•	Color management
•	Filtering
•	Categorization
________________________________________
Fields
Base Entity
_id, createdAt, organizationId (denormalized from the parent project, for tenant-scoped queries). No soft-delete fields — deliberate simplification, since Labels are lightweight reference data, not a core auditable entity like Project/Workspace/Organization, and the business rule below is a hard removal ("deleting a label removes it from all associated tasks"), not an archive.
Business Fields
Field	Type	Required	Description
projectId	ObjectId	Yes	Parent project
name	String	Yes	Label name
color	String	Yes	HEX color
description	String	No	Description
________________________________________
Relationships
Project

↓

Labels

↓

Tasks
________________________________________
Business Rules
•	Labels are unique inside a project.
•	Labels can be reused by many tasks.
•	Deleting a label removes it from all associated tasks.
________________________________________
Task Collections
________________________________________
1. Tasks Collection
Purpose
Represents a unit of work inside a project.
Tasks are the primary business entity of TaskFlow.
________________________________________
Responsibilities
•	Work tracking
•	Assignment
•	Collaboration
•	Deadlines
•	Priorities
•	Progress monitoring
________________________________________
Lifecycle
Created

↓

Todo

↓

In Progress

↓

In Review

↓

Completed

↓

Archived
Future
Cancelled
Blocked
Reopened
________________________________________
Fields
Base Entity
Standard Base Entity fields.
Business Fields
Field	Type	Required	Description
projectId	ObjectId	Yes	Parent project
parentTaskId	ObjectId	No	Parent task for subtasks
title	String	Yes	Task title
description	String	No	Markdown description
status	Enum	Yes	Task status
priority	Enum	Yes	Priority
assigneeId	ObjectId	No	Assigned user
reporterId	ObjectId	Yes	Task creator/reporter
dueDate	Date	No	Due date
startDate	Date	No	Planned start
completedAt	Date	No	Completion time
labelIds	ObjectId[]	No	Associated labels
________________________________________
Not implemented (M5): estimatedHours/actualHours appear in this table but no endpoint in ApiSpecifications.md's Task Module ever accepts them (not in Create's request body, not in Update's Editable Fields) — there's no way to set them through the API as specified, so they were left off the actual model rather than shipping unreachable fields. Add them (model + validation + an endpoint field) the day something needs to set them.
________________________________________
Status
TODO

IN_PROGRESS

IN_REVIEW

DONE

ARCHIVED
________________________________________
Priority
LOW

MEDIUM

HIGH

CRITICAL
________________________________________
Relationships
Project

↓

Task

├── Subtasks

├── Comments

├── Attachments

├── Activities

└── Labels
________________________________________
Indexes
Compound Index
organizationId

projectId

status
Additional Indexes
•	assigneeId
•	reporterId
•	dueDate
•	priority
•	parentTaskId
•	createdAt
________________________________________
Business Rules
•	Every task belongs to one project.
•	Tasks may have one parent task.
•	Root tasks have a null parentTaskId.
•	Archived tasks cannot be modified (403 on Update; delete is still allowed, same as Workspace/Project).
•	Completed tasks record completedAt automatically; moving status away from DONE clears it back to null (not explicitly specified, but the natural inverse — a task un-done shouldn't keep a stale completion timestamp).
•	Soft delete is mandatory. Restore goes through the same Update endpoint (PATCH { isDeleted: false }) rather than a dedicated route — see ApiSpecifications.md's Restore Task.
________________________________________
Common Queries
•	Tasks by project
•	Tasks by assignee
•	Overdue tasks
•	Tasks due today
•	High-priority tasks
•	Project backlog
•	Root tasks
•	Subtasks
•	Recently completed tasks
________________________________________
2. TaskComments Collection
Purpose
Stores discussions related to a task.
Comments are independent documents to support pagination, editing, and future threaded discussions.
________________________________________
Fields
Base Entity
Standard Base Entity fields.
Business Fields
Field	Type	Required
taskId	ObjectId	Yes
content	String	Yes
mentionedUserIds	ObjectId[]	No
editedAt	Date	No
________________________________________
Relationships
Task

↓

Comments

↓

Author (User)
________________________________________
3. TaskAttachments Collection
Purpose
Stores metadata for files attached to tasks.
Actual files are stored in Cloudinary.
________________________________________
Fields
Base Entity
Standard Base Entity fields.
Business Fields
Field	Type	Required
taskId	ObjectId	Yes
uploadedBy	ObjectId	Yes
fileName	String	Yes
originalFileName	String	Yes
mimeType	String	Yes
fileSize	Number	Yes
cloudinaryPublicId	String	Yes
fileUrl	String	Yes
________________________________________
Business Rules
•	Only metadata is stored in MongoDB.
•	File binaries are never stored in MongoDB.
•	Deleting an attachment also removes it from Cloudinary.
________________________________________
4. TaskActivities Collection
Purpose
Maintains an immutable audit trail of all significant task events.
Examples:
•	Task created
•	Status changed
•	Priority updated
•	Assignee changed
•	Comment added
•	Attachment uploaded
________________________________________
Fields
Base Entity
_id, createdAt, organizationId (denormalized, for tenant-scoped queries). No soft-delete fields — matches "append-only" below; there's nothing to soft-delete.
Business Fields
Field	Type	Required
taskId	ObjectId	Yes
actorId	ObjectId	Yes
action	String	Yes
previousValue	Mixed	No
newValue	Mixed	No
metadata	Mixed	No
`action` is implemented as a free string, not a real Mongo enum constraint — same choice `AuditLog` already made (`server/src/modules/audit/auditLog.model.ts`), for consistency. Values in use as of M5: TASK_CREATED, TASK_UPDATED, TASK_ASSIGNED, TASK_STATUS_CHANGED, TASK_COMPLETED, TASK_DELETED, TASK_RESTORED.
________________________________________
Business Rules
•	Activities are append-only.
•	Activities cannot be edited.
•	Activities cannot be deleted except under administrative retention policies.
•	Every significant change to a task generates an activity record — written alongside (not instead of) an AuditLog entry for the same event.

System Collections
System collections support authentication, collaboration, auditing, and infrastructure. They are not part of the core business domain but are essential for running the application.
________________________________________
1. Invitations Collection
Purpose
Stores invitations sent to users for joining an organization.
Invitations allow onboarding through email before a user becomes an organization member.
________________________________________
Responsibilities
•	Generate invitation links
•	Track invitation status
•	Prevent duplicate invitations
•	Expire invitations automatically
________________________________________
Fields
Base Fields
Field	Type	Required
_id	ObjectId	Yes
createdAt	Date	Yes
updatedAt	Date	Yes
Business Fields
Field	Type	Required	Description
organizationId	ObjectId	Yes	Target organization
email	String	Yes	Invited email
role	Enum	Yes	Assigned role
invitedBy	ObjectId	Yes	User sending invitation
token	String	Yes	Invitation token (hashed)
expiresAt	Date	Yes	Expiration date
status	Enum	Yes	PENDING, ACCEPTED, REJECTED, EXPIRED
________________________________________
Relationships
Organization
        │
 Invitation
        │
      User
________________________________________
Business Rules
•	Invitations expire automatically.
•	Email must be unique while invitation is pending.
•	Expired invitations cannot be accepted.
________________________________________
2. Notifications Collection
Purpose
Stores in-app notifications for users.
________________________________________
Responsibilities
•	Notify assignments
•	Notify mentions
•	Notify due dates
•	Notify invitations
•	Notify project updates
________________________________________
Fields
Field	Type
userId	ObjectId
organizationId	ObjectId
title	String
message	String
type	Enum
isRead	Boolean
readAt	Date
metadata	Object
________________________________________
Notification Types
•	TASK_ASSIGNED
•	TASK_UPDATED
•	TASK_COMPLETED
•	COMMENT_ADDED
•	INVITATION_SENT
•	INVITATION_ACCEPTED
•	DUE_DATE_REMINDER
•	PROJECT_ARCHIVED
________________________________________
3. Sessions Collection
Purpose
Stores active login sessions.
Redis provides fast access, while MongoDB stores persistent session metadata for auditing and device management.
________________________________________
Responsibilities
•	Session tracking
•	Device management
•	Logout from all devices
•	Refresh token metadata
________________________________________
Fields
Field	Type
userId	ObjectId
refreshTokenHash	String
device	String
browser	String
operatingSystem	String
ipAddress	String
lastActiveAt	Date
expiresAt	Date
revokedAt	Date
isRevoked	Boolean
________________________________________
Business Rules
•	Refresh tokens are never stored in plain text.
•	A user may have multiple active sessions.
•	Expired sessions are automatically removed.
•	Logout revokes only the current session unless "logout all" is requested.
________________________________________
4. AuditLogs Collection
Purpose
Maintains a permanent security and compliance trail of important system actions.
Unlike TaskActivities, AuditLogs are not displayed to end users.
________________________________________
Responsibilities
•	Security auditing
•	Compliance
•	Debugging
•	Administrative history
________________________________________
Fields
Field	Type
organizationId	ObjectId
actorId	ObjectId
entityType	String
entityId	ObjectId
action	String
previousValue	Mixed
newValue	Mixed
ipAddress	String
userAgent	String
________________________________________
Examples
•	LOGIN
•	LOGOUT
•	PASSWORD_CHANGED
•	ROLE_UPDATED
•	USER_REMOVED
•	ORGANIZATION_CREATED
•	WORKSPACE_ARCHIVED
•	PROJECT_DELETED
________________________________________
Business Rules
•	Audit logs are immutable.
•	Audit logs cannot be updated.
•	Audit logs cannot be deleted by application users.
•	Only retention policies may archive old audit records.
________________________________________
Indexes & Query Optimization
Indexes are designed around real application queries rather than individual fields.
Users
Unique Index
•	email
Indexes
•	createdAt
________________________________________
Organizations
Indexes
•	name
•	createdAt
________________________________________
OrganizationMembers
Compound Index
•	organizationId + userId
Indexes
•	role
•	status
________________________________________
Workspaces
Compound Index
•	organizationId + name
________________________________________
WorkspaceMembers
Compound Index
•	workspaceId + userId (unique)
________________________________________
Projects
Compound Index
•	organizationId + workspaceId
Indexes
•	status
•	archivedAt
________________________________________
Tasks
Compound Indexes
•	organizationId + projectId + status
•	organizationId + assigneeId + status
•	organizationId + dueDate
•	organizationId + priority
•	organizationId + parentTaskId
Additional Indexes
•	createdAt
•	updatedAt
________________________________________
Comments
Indexes
•	taskId
•	createdAt
________________________________________
Attachments
Indexes
•	taskId
________________________________________
Activities
Indexes
•	taskId
•	createdAt
________________________________________
Notifications
Compound Index
•	userId + isRead
Indexes
•	createdAt
•	type
________________________________________
Sessions
Indexes
•	userId
•	expiresAt (TTL Index)
________________________________________
Invitations
Indexes
•	email
•	expiresAt (TTL Index)
________________________________________
Query Optimization Strategy
The database follows these optimization principles:
•	Always filter by organizationId first for tenant-scoped entities.
•	Use compound indexes matching common filter patterns.
•	Implement cursor-based pagination for large datasets where appropriate.
•	Return only required fields using projections.
•	Avoid N+1 query patterns by batching lookups.
•	Cache expensive analytics queries in Redis.
•	Use aggregation pipelines only for reporting and dashboards.
•	Archive rather than hard-delete business records.
________________________________________
Data Integrity & Cascade Rules
General Principles
TaskFlow uses soft deletion for business entities and explicit cascade handling in the service layer.
MongoDB does not enforce foreign keys, so the application is responsible for maintaining referential integrity.
________________________________________
Cascade Rules
Organization
Deleting an organization:
•	Does not touch its Workspace or WorkspaceMember documents directly — they become orphaned but harmless, since every workspace route resolves the organization first (`isDeleted: false`) and 404s once it's gone. Same pattern M2 established for OrganizationMember.
•	Soft deletes projects.
•	Soft deletes tasks.
•	Revokes a member's session only if the deleted organization was the only one that session had accessed (sessions are global per user, not per-organization, so a session still tied to another org is left alone).
•	Archives notifications.
•	Preserves audit logs.
________________________________________
Workspace
Deleting a workspace:
•	Soft deletes projects (once Projects exist — not yet built as of M3).
•	Soft deletes tasks.
•	Does not touch its WorkspaceMember rows — orphaned but harmless, same reasoning as Organization → OrganizationMember.
•	Preserves audit history.
________________________________________
Project
Deleting a project:
•	Soft deletes tasks.
•	Preserves comments and attachments until task retention policies apply.
________________________________________
Task
Deleting a task:
•	Soft deletes subtasks.
•	Soft deletes comments.
•	Soft deletes attachments.
•	Preserves task activities.
•	Records an audit log.
________________________________________
User
Deleting a user account:
•	Revokes all sessions.
•	Removes organization memberships.
•	Reassigns ownership where required.
•	Preserves historical references (createdBy, updatedBy) to maintain audit integrity.
________________________________________
Referential Integrity Rules
•	Every Project must reference an existing Workspace.
•	Every Workspace must reference an existing Organization.
•	Every Task must reference an existing Project.
•	Every Comment must reference an existing Task.
•	Every Attachment must reference an existing Task.
•	Every Notification must reference an existing User.
•	Every OrganizationMember must reference both a valid User and Organization.
Validation is enforced at the application layer before persistence.
________________________________________
Common Query Patterns
The following queries represent the most common access patterns anticipated in TaskFlow.
Authentication
•	Find user by email.
•	Validate session by refresh token.
•	Retrieve active sessions for a user.
________________________________________
Organization
•	List organizations for a user.
•	List members of an organization.
•	Retrieve organization settings.
________________________________________
Workspace
•	List workspaces in an organization.
•	Retrieve workspace details.
•	Search workspaces by name.
________________________________________
Project
•	List projects in a workspace.
•	Retrieve project statistics.
•	Search active projects.
________________________________________
Task
•	List tasks for a project.
•	List tasks assigned to a user.
•	Retrieve overdue tasks.
•	Retrieve tasks due today.
•	Retrieve tasks by priority.
•	Retrieve completed tasks.
•	Retrieve subtasks for a parent task.
•	Search tasks by title or label.
________________________________________
Dashboard
•	Count tasks by status.
•	Count overdue tasks.
•	Count completed tasks.
•	Recent activity feed.
•	Productivity summary.
•	Project progress.
________________________________________
Notifications
•	Retrieve unread notifications.
•	Mark notifications as read.
•	Retrieve recent notifications.
________________________________________
Audit
•	Retrieve user login history.
•	Retrieve organization activity.
•	Retrieve role changes.
•	Retrieve security events.
________________________________________
Database Design Summary
The database design follows a normalized, multi-tenant architecture optimized for scalability, maintainability, and security.
Key characteristics include:
•	Strict tenant isolation using organizationId.
•	Base Entity pattern for consistent metadata.
•	Membership-based authorization model.
•	Soft deletion with audit preservation.
•	Normalized business entities connected through references.
•	Redis-backed session management and caching.
•	Service-layer enforcement of referential integrity.
•	Query-first indexing strategy aligned with application access patterns.
This design provides a stable foundation for implementing repositories, services, and APIs while remaining extensible for future features such as recurring tasks, AI assistance, billing, and real-time collaboration.