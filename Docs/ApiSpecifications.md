Standard Api endpoint template 
## Create Task

POST /api/v1/tasks

Description

Authentication

Authorization

Headers

Path Parameters

Query Parameters

Request Body

Validation Rules

Success Response

Error Responses

Business Rules

Database Operations

Audit Log

Cache Impact

Rate Limit

________________________________________

06-api-specification.md
TaskFlow REST API Specification
Version: 1.0
Architecture: RESTful API
Base URL
/api/v1
________________________________________
Table of Contents
1.	Introduction
2.	API Design Principles
3.	API Standards
4.	Authentication
5.	Request Standards
6.	Response Standards
7.	HTTP Status Codes
8.	Error Codes
9.	Pagination
10.	Filtering
11.	Sorting
12.	API Versioning
13.	Rate Limiting
14.	API Security
________________________________________
1. Introduction
TaskFlow exposes a RESTful API that serves as the communication layer between the frontend and backend.
The API is designed with the following goals:
•	Predictability
•	Consistency
•	Security
•	Scalability
•	Maintainability
•	Versioning
•	Clear error reporting
Every endpoint follows the same request and response conventions.
________________________________________
2. API Design Principles
The API follows REST principles.
Resource-Oriented Design
Resources are represented using nouns.
Examples
/users
/projects
/tasks
/comments
Avoid verbs such as:
/createTask
/getProjects
/deleteUser
________________________________________
Stateless Communication
Each request must contain all information required for processing.
The server does not maintain request state between API calls.
________________________________________
Consistent Naming
Use plural resource names.
Examples
/users
/tasks
/projects
/workspaces
________________________________________
Standard HTTP Methods
Method	Purpose
GET	Retrieve data
POST	Create data
PATCH	Partial update
PUT	Full replacement (rarely used)
DELETE	Soft delete resource
________________________________________
3. API Standards
Base URL
/api/v1
Future versions:
/api/v2
________________________________________
Content Type
All requests must use:
Content-Type: application/json
Multipart requests are used only for file uploads.
________________________________________
Character Encoding
UTF-8
________________________________________
Time Format
All timestamps use ISO 8601 UTC.
Example
"2026-08-06T12:30:15.000Z"
________________________________________
Resource Identifiers
MongoDB ObjectId values are used as resource identifiers.
Example
687a5d7c91dfe64a1e4d1234
________________________________________
4. Authentication
Protected endpoints require an access token.
Authorization: Bearer <access_token>
Authentication uses:
•	JWT Access Token
•	Refresh Token
•	Secure password hashing
Tokens must never be included in query parameters.
________________________________________
5. Request Standards
Every request may contain:
Headers
Example
Authorization

Content-Type

Accept
________________________________________
Path Parameters
Example
GET /tasks/{taskId}
________________________________________
Query Parameters
Example
?page=1

&limit=20

&sortBy=createdAt

&order=desc
________________________________________
Request Body
POST
PATCH
PUT
requests contain JSON request bodies.
GET requests never contain request bodies.
________________________________________
6. Response Standards
Success Response
{
  "success": true,
  "message": "Task created successfully.",
  "data": {}
}
________________________________________
Error Response
{
  "success": false,
  "message": "Validation failed.",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": []
  }
}
________________________________________
List Response
{
  "success": true,
  "message": "Tasks retrieved successfully.",
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 240,
    "totalPages": 12,
    "hasNext": true,
    "hasPrevious": false
  }
}
________________________________________
7. HTTP Status Codes
Code	Meaning
200	OK
201	Created
204	No Content
400	Bad Request
401	Unauthorized
403	Forbidden
404	Not Found
409	Conflict
422	Unprocessable Entity
429	Too Many Requests
500	Internal Server Error
________________________________________
8. Error Codes
Error Code	Description
VALIDATION_ERROR	Invalid request data
UNAUTHORIZED	Authentication required
FORBIDDEN	Permission denied
RESOURCE_NOT_FOUND	Resource does not exist
DUPLICATE_RESOURCE	Duplicate value
TOKEN_EXPIRED	Access token expired
INVALID_TOKEN	Invalid token
ACCOUNT_DISABLED	User account disabled
EMAIL_NOT_VERIFIED	Email not verified
RATE_LIMIT_EXCEEDED	Too many requests
INTERNAL_SERVER_ERROR	Unexpected server error
________________________________________
9. Pagination
All collection endpoints support pagination.
Query Parameters
?page=1

&limit=20
Default
page = 1

limit = 20
Maximum
limit = 100
________________________________________
10. Filtering
Endpoints may support filtering using query parameters.
Examples
?status=TODO

?priority=HIGH

?workspaceId=...

?projectId=...

?assigneeId=...
Multiple filters may be combined.
________________________________________
11. Sorting
Supported format
?sortBy=createdAt

&order=desc
Common sort fields
•	createdAt
•	updatedAt
•	dueDate
•	priority
•	title
________________________________________
12. API Versioning
Current version
/api/v1
Breaking changes require a new version.
Older versions remain supported during migration periods.
________________________________________
13. Rate Limiting
Public endpoints
•	Authentication
•	Password reset
•	Email verification
Protected endpoints
Rate limits are applied per authenticated user.
Redis-backed rate limiting will be introduced for production deployments.
________________________________________
14. API Security
The API follows these security rules.
•	JWT authentication for protected endpoints.
•	RBAC authorization checks.
•	Organization-level tenant isolation.
•	Input validation using Zod.
•	Password hashing with bcrypt.
•	HTTPS in production.
•	Helmet security headers.
•	CORS restrictions.
•	Sensitive configuration stored in environment variables.
•	Soft deletion for business entities.
•	Audit logging for security-sensitive actions.
________________________________________
Endpoint Documentation Template
Every endpoint in this document follows the same structure:
•	Endpoint
•	Description
•	Authentication
•	Authorization
•	Headers
•	Path Parameters
•	Query Parameters
•	Request Body
•	Validation Rules
•	Success Response
•	Error Responses
•	Business Rules
•	Database Operations
•	Audit Log
•	Cache Impact
•	Rate Limit

Part 2 - Authentication APIs
________________________________________
Authentication Module
Overview
The Authentication module is responsible for:
•	User Registration
•	Login
•	Logout
•	Access Token Refresh
•	Email Verification
•	Forgot Password
•	Password Reset
•	Session Management
Base Path
/api/v1/auth
Authentication APIs are public unless stated otherwise.
________________________________________
1. Register User
Endpoint
POST /api/v1/auth/register
________________________________________
Description
Creates a new user account.
The account remains inactive until the user's email is verified.
________________________________________
Authentication
Not Required
________________________________________
Authorization
Public
________________________________________
Headers
Content-Type: application/json
________________________________________
Request Body
{
  "firstName": "Anshuman",
  "lastName": "Singh",
  "email": "anshuman@example.com",
  "password": "StrongPassword123!"
}
________________________________________
Validation Rules
•	First name is required.
•	Last name is required.
•	Email must be unique.
•	Email must be valid.
•	Password must be at least 8 characters.
•	Password must contain:
o	Uppercase letter
o	Lowercase letter
o	Number
o	Special character
________________________________________
Success Response
201 Created
{
  "success": true,
  "message": "Registration successful. Please verify your email."
}
________________________________________
Error Responses
•	400 Bad Request
•	409 Duplicate Email
•	422 Validation Error
•	500 Internal Server Error
________________________________________
Database Operations
•	Create User
•	Create Verification Token
•	Create Audit Log
________________________________________
Background Jobs
•	Send verification email
________________________________________
Business Rules
•	Email must be unique.
•	Password is hashed before storage.
•	Verification token expires after 24 hours.
________________________________________
2. Verify Email
Endpoint
POST /api/v1/auth/verify-email
________________________________________
Description
Verifies a user's email using a verification token.
________________________________________
Authentication
Not Required
________________________________________
Request Body
{
  "token": "<verification-token>"
}
________________________________________
Success Response
{
  "success": true,
  "message": "Email verified successfully."
}
________________________________________
Error Responses
•	Invalid token
•	Expired token
•	Already verified
________________________________________
Database Operations
•	Update User
•	Delete Verification Token
•	Create Audit Log
________________________________________
3. Login
Endpoint
POST /api/v1/auth/login
________________________________________
Description
Authenticates a user and creates a new session.
________________________________________
Authentication
Not Required
________________________________________
Request Body
{
  "email": "anshuman@example.com",
  "password": "StrongPassword123!"
}
________________________________________
Validation Rules
•	Email required
•	Password required
________________________________________
Success Response
200 OK
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "accessToken": "<jwt-access-token>",
    "user": {}
  }
}
Refresh Token
•	Returned as an HTTP-only Secure Cookie.
•	Never exposed to JavaScript.
________________________________________
Error Responses
•	Invalid credentials
•	Email not verified
•	Account disabled
•	Too many login attempts
________________________________________
Database Operations
•	Validate User
•	Create Session
•	Create Audit Log
________________________________________
Background Jobs
•	Update login analytics (future)
________________________________________
Business Rules
•	Email must be verified.
•	Password comparison uses bcrypt.
•	Multiple device sessions are supported.
________________________________________
4. Refresh Access Token
Endpoint
POST /api/v1/auth/refresh
________________________________________
Description
Issues a new access token using a valid refresh token.
________________________________________
Authentication
Refresh Token Cookie Required
________________________________________
Request
No request body.
Refresh token is read from the HTTP-only cookie.
________________________________________
Success Response
{
  "success": true,
  "message": "Access token refreshed.",
  "data": {
    "accessToken": "<new-access-token>"
  }
}
________________________________________
Error Responses
•	Missing refresh token
•	Invalid refresh token
•	Expired session
________________________________________
Database Operations
•	Validate Session
•	Rotate Refresh Token
•	Update Session
________________________________________
Business Rules
•	Refresh tokens are rotated on every successful refresh.
•	Old refresh tokens are revoked.
________________________________________
5. Logout
Endpoint
POST /api/v1/auth/logout
________________________________________
Description
Logs the current device out.
________________________________________
Authentication
Required
________________________________________
Headers
Authorization: Bearer <access-token>
________________________________________
Success Response
{
  "success": true,
  "message": "Logged out successfully."
}
________________________________________
Database Operations
•	Revoke Session
•	Create Audit Log
________________________________________
Side Effects
•	Clear refresh token cookie.
________________________________________
6. Logout From All Devices
Endpoint
POST /api/v1/auth/logout-all
________________________________________
Description
Revokes all active sessions for the authenticated user.
________________________________________
Authentication
Required
________________________________________
Success Response
{
  "success": true,
  "message": "All sessions have been terminated."
}
________________________________________
Database Operations
•	Revoke all user sessions
•	Create Audit Log
________________________________________
7. Forgot Password
Endpoint
POST /api/v1/auth/forgot-password
________________________________________
Description
Generates a password reset link.
Always returns the same success message to prevent email enumeration.
________________________________________
Authentication
Not Required
________________________________________
Request Body
{
  "email": "anshuman@example.com"
}
________________________________________
Success Response
{
  "success": true,
  "message": "If an account exists, a password reset email has been sent."
}
________________________________________
Background Jobs
•	Send password reset email
________________________________________
Business Rules
•	Reset token expires after 30 minutes.
•	Existing reset tokens are invalidated when a new one is created.
________________________________________
8. Reset Password
Endpoint
POST /api/v1/auth/reset-password
________________________________________
Description
Resets the user's password using a valid reset token.
________________________________________
Request Body
{
  "token": "<reset-token>",
  "newPassword": "NewStrongPassword123!"
}
________________________________________
Validation Rules
•	Token must be valid.
•	Password must satisfy password policy.
________________________________________
Success Response
{
  "success": true,
  "message": "Password reset successfully."
}
________________________________________
Database Operations
•	Update User Password
•	Delete Reset Token
•	Revoke Existing Sessions
•	Create Audit Log
________________________________________
Business Rules
•	Password is hashed before storage.
•	All active sessions are revoked after a successful password reset.
________________________________________
Authentication Rate Limits
Endpoint	Limit
Register	5 requests / IP / hour
Login	10 requests / IP / 15 minutes
Forgot Password	5 requests / IP / hour
Verify Email	10 requests / IP / hour
Refresh Token	60 requests / user / hour
________________________________________
Authentication Audit Events
The following events create audit logs:
•	USER_REGISTERED
•	EMAIL_VERIFIED
•	LOGIN_SUCCESS
•	LOGIN_FAILED
•	LOGOUT
•	LOGOUT_ALL
•	PASSWORD_RESET_REQUESTED
•	PASSWORD_RESET_COMPLETED
•	SESSION_REFRESHED
________________________________________
Authentication Flow Summary
Register
    ↓
Verify Email
    ↓
Login
    ↓
Create Session
    ↓
Issue Access Token
    ↓
Access Protected APIs
    ↓
Refresh Token Rotation
    ↓
Logout


Part 3 - User, Organization & Workspace APIs
________________________________________
User Module
Base Path
/api/v1/users
All User APIs require authentication.
________________________________________
1. Get Current User
Endpoint
GET /api/v1/auth/me
________________________________________
Description
Returns the currently authenticated user's profile along with their organization memberships.
________________________________________
Authentication
Required
________________________________________
Authorization
Authenticated User
________________________________________
Success Response
{
  "success": true,
  "data": {
    "user": {},
    "organizations": []
  }
}
________________________________________
Database Operations
•	Fetch User
•	Fetch Organization Memberships
________________________________________
Business Rules
•	Only the authenticated user can access this endpoint.
________________________________________
2. Update Profile
Endpoint
PATCH /api/v1/users/profile
________________________________________
Description
Updates profile information.
________________________________________
Request Body
{
  "firstName": "Anshuman",
  "lastName": "Singh",
  "avatar": "..."
}
________________________________________
Validation
•	Name required
•	Avatar optional
________________________________________
Business Rules
•	Email cannot be changed from this endpoint.
•	Password cannot be changed from this endpoint.
________________________________________
3. Change Password
Endpoint
PATCH /api/v1/users/password
________________________________________
Authentication
Required
________________________________________
Request Body
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!"
}
________________________________________
Business Rules
•	Current password must match.
•	New password must satisfy password policy.
•	All other active sessions are revoked after a successful password change.
________________________________________
Organization Module
Base Path
/api/v1/organizations
________________________________________
1. Create Organization
Endpoint
POST /api/v1/organizations
________________________________________
Authentication
Required
________________________________________
Description
Creates a new organization.
The authenticated user automatically becomes the Owner.
________________________________________
Request Body
{
  "name": "Acme Technologies",
  "slug": "acme-technologies"
}
________________________________________
Validation Rules
•	Organization name required.
•	Slug must be unique.
•	Slug is URL-safe.
________________________________________
Success Response
201 Created
________________________________________
Database Operations
•	Create Organization
•	Create OrganizationMember
•	Create Audit Log
________________________________________
2. List User Organizations
Endpoint
GET /api/v1/organizations
________________________________________
Description
Returns all organizations the current user belongs to.
________________________________________
Success Response
{
  "success": true,
  "data": []
}
________________________________________
3. Get Organization
Endpoint
GET /api/v1/organizations/{organizationId}
________________________________________
Authorization
Organization Member
________________________________________
Business Rules
•	User must belong to the organization.
________________________________________
4. Update Organization
Endpoint
PATCH /api/v1/organizations/{organizationId}
________________________________________
Authorization
Owner
Admin
________________________________________
Editable Fields
•	Name
•	Logo
•	Description
________________________________________
5. Delete Organization
Endpoint
DELETE /api/v1/organizations/{organizationId}
________________________________________
Authorization
Owner Only
________________________________________
Business Rules
•	Organization is soft deleted.
•	Related resources are archived according to cascade rules.
________________________________________
Organization Member Module
Base Path
/api/v1/organizations/{organizationId}/members
________________________________________
1. List Members
GET /
Authorization
Organization Member
________________________________________
2. Invite Member
POST /
Authorization
Owner
Admin
________________________________________
Request
{
  "email": "user@example.com",
  "role": "MEMBER"
}
________________________________________
Side Effects
•	Create Invitation
•	Send Email
•	Audit Log
________________________________________
Invitation Endpoints (base path /api/v1/organizations)
Accept Invitation
POST /invitations/accept
Request: { "token": "..." }
List Pending Invitations
GET /invitations/pending
Returns pending, non-expired invitations addressed to the current user's email.
Decline Invitation
POST /invitations/{invitationId}/decline
Authorization: the invitation must be addressed to the current user's email.
Business Rules
•	Invitations expire after 5 days.
•	A declined invitation cannot later be accepted.
________________________________________
3. Update Member Role
PATCH /{memberId}/role
________________________________________
Authorization
Owner
Admin
________________________________________
Request
{
  "role": "MANAGER"
}
________________________________________
Business Rules
•	Owner role cannot be assigned through this endpoint.
•	Owner cannot demote themselves.
________________________________________
4. Remove Member
DELETE /{memberId}
________________________________________
Authorization
Owner
Admin
________________________________________
Business Rules
•	Organization must always have exactly one Owner.
•	Member cannot remove themselves through this endpoint.
________________________________________
Workspace Module
Base Path
/api/v1/workspaces
________________________________________
1. Create Workspace
POST /api/v1/workspaces
________________________________________
Authorization
Owner
Admin
Manager
________________________________________
Request
{
  "organizationId": "...",
  "name": "Engineering"
}
________________________________________
Database Operations
•	Create Workspace
•	Audit Log
________________________________________
2. List Workspaces
GET /api/v1/workspaces
________________________________________
Query Parameters
organizationId=...
________________________________________
Returns
All workspaces visible to the current user within the selected organization.
________________________________________
3. Get Workspace
GET /api/v1/workspaces/{workspaceId}
________________________________________
Authorization
Organization Member (any role — workspace visibility is org-scoped, not gated by WorkspaceMember; see Workspace Member Module below)
________________________________________
4. Update Workspace
PATCH /api/v1/workspaces/{workspaceId}
________________________________________
Authorization
Owner
Admin
Manager
________________________________________
Editable Fields
•	Name
•	Description
Status is not editable here — it only changes via the dedicated Archive endpoint (5).
________________________________________
5. Archive Workspace
PATCH /api/v1/workspaces/{workspaceId}/archive
________________________________________
Authorization
Owner
Admin
________________________________________
Business Rules
•	Archived workspaces become read-only: Update (4) and Add Workspace Member are rejected.
•	Existing data remains accessible; deleting the workspace and removing members are still allowed.
________________________________________
6. Delete Workspace
DELETE /api/v1/workspaces/{workspaceId}
________________________________________
Authorization
Owner
Admin
________________________________________
Business Rules
•	Workspace is soft deleted.
•	Projects are archived according to cascade rules (once Projects exist — not yet built as of M3).
•	WorkspaceMember rows are left as-is (orphaned but harmless — the workspace itself becomes unreachable).
________________________________________
Workspace Member Module
Base Path
/api/v1/workspaces/{workspaceId}/members
________________________________________
1. List Workspace Members
GET /
Authorization
Organization Member (any role)
________________________________________
2. Add Workspace Member
POST /
Authorization
Owner
Admin
Manager
Request
{
  "userId": "..."
}
Business Rules
•	The user must already be a member of the parent organization (400 if not).
•	Rejects duplicate membership (409).
•	Rejects if the workspace is archived (403).
Side Effects
•	Create WorkspaceMember
•	Audit Log
________________________________________
3. Remove Workspace Member
DELETE /{memberId}
Authorization
Owner
Admin
Manager
Side Effects
•	Delete WorkspaceMember
•	Audit Log
________________________________________
Organization Roles
OWNER

ADMIN

MANAGER

MEMBER

GUEST
________________________________________
Audit Events
The following actions generate audit records:
•	ORGANIZATION_CREATED
•	ORGANIZATION_UPDATED
•	ORGANIZATION_DELETED
•	MEMBER_INVITED
•	MEMBER_ROLE_UPDATED
•	MEMBER_REMOVED
•	WORKSPACE_CREATED
•	WORKSPACE_UPDATED
•	WORKSPACE_ARCHIVED
•	WORKSPACE_DELETED
•	WORKSPACE_MEMBER_ADDED
•	WORKSPACE_MEMBER_REMOVED

Part 4 - Project & Task APIs
________________________________________
Project Module
Base Path
/api/v1/organizations/{organizationId}/workspaces/{workspaceId}/projects
________________________________________
1. Create Project
Endpoint
POST /
________________________________________
Description
Creates a new project inside a workspace.
________________________________________
Authentication
Required
________________________________________
Authorization
•	Owner
•	Admin
•	Manager
________________________________________
Request Body
{
    "name":"Authentication Service",
    "key":"AUTH",
    "description":"Handles authentication APIs",
    "startDate":"2026-08-10",
    "endDate":"2026-09-15"
}
________________________________________
Validation Rules
•	Project name required
•	Project key required
•	Project key unique within workspace
•	Start date <= End date
________________________________________
Success Response
201 Created
{
    "success":true,
    "message":"Project created successfully.",
    "data":{}
}
________________________________________
Database Operations
•	Create Project
•	Create Audit Log
________________________________________
Business Rules
•	Project names are unique inside a workspace.
•	Workspace must exist.
•	Workspace must not be archived.
________________________________________
2. Get Projects
Endpoint
GET /
________________________________________
Description
Returns all projects inside a workspace.
________________________________________
Query Parameters
?page=1

&limit=20

&status=ACTIVE

&sortBy=createdAt

&order=desc
________________________________________
Authorization
Workspace Member
________________________________________
Success Response
Returns paginated project list.
________________________________________
3. Get Project
Endpoint
GET /{projectId}
________________________________________
Authorization
Workspace Member
________________________________________
Returns
Complete project information.
________________________________________
4. Update Project
Endpoint
PATCH /{projectId}
________________________________________
Editable Fields
•	name
•	description
•	status
•	startDate
•	endDate
________________________________________
Authorization
Owner
Admin
Manager
________________________________________
Business Rules
•	Completed projects cannot return to Planning.
•	An already-archived project rejects further updates through this endpoint (403) — matches DatabaseDesign.md's "archived projects remain searchable but are read-only."
•	startDate must be before or equal to endDate.
________________________________________
5. Archive Project
Implemented using
PATCH /{projectId}
{
    "status":"ARCHIVED"
}
________________________________________
6. Delete Project
Endpoint
DELETE /{projectId}
________________________________________
Authorization
Owner
Admin
________________________________________
Business Rules
•	Projects are soft deleted.
•	Allowed even on an archived project (deletion/cleanup isn't blocked by read-only).
________________________________________
Task Module
Base Path
/api/v1/projects/{projectId}/tasks
________________________________________
1. Create Task
Endpoint
POST /
________________________________________
Description
Creates a new task.
________________________________________
Authorization
Owner
Admin
Manager
Member (based on workspace permissions)
________________________________________
Request Body
{
    "title":"Implement Login API",
    "description":"JWT authentication endpoint",
    "priority":"HIGH",
    "assigneeId":"...",
    "dueDate":"2026-08-15",
    "parentTaskId":null,
    "labelIds":[]
}
________________________________________
Validation Rules
•	Title required
•	Due date optional
•	Assignee must belong to workspace
•	Parent task must belong to same project
________________________________________
Database Operations
•	Create Task
•	Create Task Activity
•	Create Audit Log
________________________________________
Side Effects
•	Queue Notification
•	Invalidate Redis Cache
________________________________________
Business Rules
•	Archived project cannot receive new tasks.
•	Parent task cannot belong to another project.
________________________________________
2. Get Tasks
Endpoint
GET /
________________________________________
Query Parameters
?page

&limit

&status

&priority

&assigneeId

&labelId

&dueDate

&sortBy

&order
________________________________________
Returns
Paginated task list.
________________________________________
3. Get Task
Endpoint
GET /{taskId}
________________________________________
Returns
Task details including
•	labels (populated)
•	subtasks (direct children)
•	comments — not returned; TaskComments is M6 (Collaboration) scope, not built yet
•	attachments — not returned; TaskAttachments is M6 (Collaboration) scope, not built yet
404 if the task is soft-deleted (see Restore Task below for the one way back).
________________________________________
4. Update Task
Endpoint
PATCH /{taskId}
________________________________________
Editable Fields
•	title
•	description
•	priority
•	status
•	dueDate
•	assigneeId
•	labelIds
Rejected (403) if the task's status is ARCHIVED.
________________________________________
Side Effects
•	Task Activity
•	Audit Log
•	Cache Invalidation
________________________________________
5. Delete Task
Endpoint
DELETE /{taskId}
________________________________________
Business Rules
•	Soft delete only.
•	404 if the task is already deleted.
________________________________________
6. Restore Task
Endpoint
PATCH /{taskId}
{
    "isDeleted":false
}
________________________________________
Business Rules
•	This is the *only* accepted body on an already-deleted task — any other field, or an update without isDeleted:false, 404s while the task is deleted (the same endpoint that edits a live task also restores a deleted one, so the two modes are mutually exclusive per request).
________________________________________
7. Get Subtasks
Endpoint
GET /{taskId}/subtasks
________________________________________
Returns
All subtasks belonging to the parent task.
________________________________________
8. Create Subtask
Endpoint
POST /{taskId}/subtasks
________________________________________
Description
Creates a child task.
The system automatically assigns
parentTaskId
________________________________________
9. Reassign Task
Implemented using
PATCH /{taskId}
{
    "assigneeId":"..."
}
________________________________________
10. Change Status
Implemented using
PATCH /{taskId}
{
    "status":"IN_PROGRESS"
}
________________________________________
11. Add Labels
Implemented using
PATCH /{taskId}
{
    "labelIds":[]
}
________________________________________
Labels Module
Base Path
/api/v1/projects/{projectId}/labels
________________________________________
Create Label
POST /
________________________________________
Get Labels
GET /
________________________________________
Update Label
PATCH /{labelId}
________________________________________
Delete Label
DELETE /{labelId}
________________________________________
Project Status
PLANNING

ACTIVE

ON_HOLD

COMPLETED

ARCHIVED
________________________________________
Task Status
TODO

IN_PROGRESS

IN_REVIEW

DONE

ARCHIVED
________________________________________
Task Priority
LOW

MEDIUM

HIGH

CRITICAL
________________________________________
Audit Events
Project
•	PROJECT_CREATED
•	PROJECT_UPDATED
•	PROJECT_ARCHIVED
•	PROJECT_DELETED
Label
•	LABEL_CREATED
•	LABEL_UPDATED
•	LABEL_DELETED
Task
•	TASK_CREATED
•	TASK_UPDATED
•	TASK_ASSIGNED
•	TASK_STATUS_CHANGED
•	TASK_COMPLETED
•	TASK_DELETED
•	TASK_RESTORED
•	TASK_RESTORED
•	TASK_DELETED
________________________________________
Redis Cache
The following endpoints invalidate cache:
•	Create Project
•	Update Project
•	Delete Project
•	Create Task
•	Update Task
•	Delete Task
•	Restore Task
________________________________________
Background Jobs
The following operations dispatch BullMQ jobs:
•	Task Assigned
•	Due Date Reminder
•	Deadline Notification
•	Weekly Report (future)
•	Analytics Refresh (future)
________________________________________
Authorization Matrix
Operation	Owner	Admin	Manager	Member	Guest
Create Project	✅	✅	✅	❌	❌
Update Project	✅	✅	✅	❌	❌
Delete Project	✅	✅	❌	❌	❌
Create Task	✅	✅	✅	✅*	❌
Update Own Task	✅	✅	✅	✅	❌
Update Any Task	✅	✅	✅	❌	❌
Delete Task	✅	✅	✅	❌	❌
* Subject to workspace permissions and project access.


Part 5 - Collaboration, Notification, Dashboard, Search, Admin & System APIs
________________________________________
Collaboration Module
Comment APIs
Base Path
/api/v1/tasks/{taskId}/comments
________________________________________
Create Comment
POST /
Authentication
Required
Authorization
•	Owner
•	Admin
•	Manager
•	Member (Workspace Member)
Request Body
{
  "content": "Authentication API completed."
}
Database Operations
•	Create Comment
•	Create Task Activity
•	Create Audit Log
Side Effects
•	Notify task participants
•	Invalidate task cache
________________________________________
Get Comments
GET /
Returns paginated comments.
Query Parameters
?page=1

&limit=20
________________________________________
Update Comment
PATCH /{commentId}
Authorization
Comment Owner
Admin
________________________________________
Delete Comment
DELETE /{commentId}
Soft delete only.
________________________________________
Attachment APIs
Base Path
/api/v1/tasks/{taskId}/attachments
________________________________________
Upload Attachment
POST /
Content Type
multipart/form-data
Request
file
Business Rules
•	Maximum file size configurable.
•	Supported MIME types only.
•	Files stored in Cloudinary.
Database Operations
•	Upload File
•	Store Metadata
•	Create Task Activity
________________________________________
List Attachments
GET /
________________________________________
Delete Attachment
DELETE /{attachmentId}
Deletes Cloudinary asset and metadata.
________________________________________
Label APIs
Base Path
/api/v1/projects/{projectId}/labels
________________________________________
Create Label
POST /
________________________________________
Get Labels
GET /
________________________________________
Update Label
PATCH /{labelId}
________________________________________
Delete Label
DELETE /{labelId}
Removing a label automatically removes its reference from associated tasks.
________________________________________
Notification Module
Base Path
/api/v1/notifications
________________________________________
Get Notifications
GET /
Returns notifications for the authenticated user.
Supports
?page

&limit

&isRead

&type
________________________________________
Mark As Read
PATCH /{notificationId}
Request
{
  "isRead": true
}
________________________________________
Mark All As Read
PATCH /read-all
Marks every unread notification for the current user as read.
________________________________________
Delete Notification
DELETE /{notificationId}
Soft delete only.
________________________________________
Dashboard Module
Base Path
/api/v1/dashboard
Dashboard endpoints are read-only.
________________________________________
Dashboard Summary
GET /summary
Returns
•	Assigned Tasks
•	Completed Tasks
•	Overdue Tasks
•	Due Today
•	Pending Tasks
________________________________________
Workspace Dashboard
GET /workspaces/{workspaceId}
Returns
•	Project Progress
•	Team Activity
•	Completion Rate
•	Active Members
________________________________________
Project Dashboard
GET /projects/{projectId}
Returns
•	Total Tasks
•	Completed Tasks
•	Burndown Metrics (Future)
•	Progress Percentage
________________________________________
Productivity Dashboard
GET /productivity
Returns
•	Personal Productivity
•	Completed Tasks
•	Average Completion Time
•	Weekly Statistics
________________________________________
Business Rules
Dashboard endpoints use Redis caching when enabled.
________________________________________
Search Module
Base Path
/api/v1/search
________________________________________
Global Search
GET /
Query Parameters
?q=authentication

&type=task

&page=1

&limit=20
Supported Types
•	Tasks
•	Projects
•	Workspaces
•	Users
________________________________________
Task Search
GET /tasks
Supported Filters
•	Status
•	Priority
•	Assignee
•	Label
•	Due Date
________________________________________
Project Search
GET /projects
Supports
•	Status
•	Workspace
•	Name
________________________________________
Business Rules
Search results are always restricted to the authenticated user's organization.
________________________________________
Admin Module
Base Path
/api/v1/admin
Only Owner and Admin roles may access these endpoints.
________________________________________
Organization Statistics
GET /statistics
Returns
•	Total Users
•	Active Users
•	Projects
•	Tasks
•	Storage Usage
________________________________________
Audit Logs
GET /audit-logs
Supports
?page

&limit

&action

&actor

&date
________________________________________
Active Sessions
GET /sessions
Returns active organization sessions.
________________________________________
Revoke Session
DELETE /sessions/{sessionId}
Revokes a specific user session.
________________________________________
Organization Invitations
GET /invitations
Returns
•	Pending
•	Accepted
•	Expired
•	Rejected
________________________________________
System Module
Base Path
/api/v1/system
________________________________________
Health Check
GET /health
Returns
•	API Status
•	Database Status
•	Redis Status
•	Queue Status
•	Uptime
________________________________________
API Information
GET /info
Returns
•	API Version
•	Environment
•	Build Version
•	Commit SHA (optional)
•	Release Date
________________________________________
Swagger Documentation
GET /docs
Redirects to OpenAPI documentation.
________________________________________
Common Side Effects
The following actions create Task Activities:
•	Task Created
•	Task Updated
•	Task Assigned
•	Comment Added
•	Attachment Uploaded
•	Status Changed
•	Priority Changed
•	Label Added
•	Label Removed
________________________________________
Audit Events
The following actions generate Audit Logs:
•	COMMENT_CREATED
•	COMMENT_UPDATED
•	COMMENT_DELETED
•	ATTACHMENT_UPLOADED
•	ATTACHMENT_DELETED
•	LABEL_CREATED
•	LABEL_UPDATED
•	LABEL_DELETED
•	NOTIFICATION_READ
•	USER_SESSION_REVOKED
•	ORGANIZATION_STATISTICS_VIEWED
________________________________________
Background Jobs
The following endpoints enqueue BullMQ jobs:
•	Upload Attachment → Virus Scan (future)
•	Create Comment → Notification Job
•	Task Assignment → Email Notification
•	Dashboard Requests → Analytics Cache Refresh
•	Due Date Checks → Reminder Job
________________________________________
Cache Strategy
Redis cache is used for:
•	Dashboard Summary
•	Workspace Dashboard
•	Project Dashboard
•	Search Suggestions (future)
•	Organization Statistics
Cache is invalidated when:
•	Tasks change
•	Projects change
•	Membership changes
•	Workspace settings change
________________________________________
API Completion Summary
Module	Status
Authentication	✅
Users	✅
Organizations	✅
Organization Members	✅
Workspaces	✅
Projects	✅
Tasks	✅
Comments	✅
Attachments	✅
Labels	✅
Notifications	✅
Dashboard	✅
Search	✅
Admin	✅
System	✅
________________________________________
REST API Version 1 Complete
TaskFlow REST API v1 provides a complete production-ready interface for:
•	Authentication & Session Management
•	Multi-Tenant Organization Management
•	Workspace & Project Management
•	Task Collaboration
•	File Attachments
•	Notifications
•	Search
•	Dashboard & Analytics
•	Administration
•	Health Monitoring
The API is designed to evolve incrementally with future additions such as Socket.IO for real-time communication, GraphQL for advanced reporting, and gRPC for internal service communication without introducing breaking changes to the existing REST contract.

