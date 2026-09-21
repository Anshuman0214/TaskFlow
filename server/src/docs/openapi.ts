export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "TaskFlow API",
    version: "1.0.0",
    description: "REST API for the TaskFlow multi-tenant SaaS platform.",
  },
  servers: [{ url: "/api/v1" }],
  paths: {
    "/": {
      get: {
        summary: "API root",
        responses: { "200": { description: "API is running" } },
      },
    },
    "/system/health": {
      get: {
        summary: "Health check",
        description: "Reports API uptime and connectivity to MongoDB and Redis.",
        responses: {
          "200": { description: "All services connected" },
          "503": { description: "One or more services disconnected" },
        },
      },
    },
    "/system/info": {
      get: {
        summary: "API information",
        responses: { "200": { description: "API name, version and environment" } },
      },
    },
    "/auth/register": {
      post: {
        summary: "Register a new user",
        description: "Creates an unverified account and emails a verification link.",
        responses: { "201": { description: "Registration successful" } },
      },
    },
    "/auth/verify-email": {
      post: {
        summary: "Verify email address",
        responses: { "200": { description: "Email verified" } },
      },
    },
    "/auth/login": {
      post: {
        summary: "Login",
        description: "Returns an access token and sets an HTTP-only refresh token cookie.",
        responses: { "200": { description: "Login successful" } },
      },
    },
    "/auth/refresh": {
      post: {
        summary: "Refresh access token",
        description: "Rotates the refresh token cookie and issues a new access token.",
        responses: { "200": { description: "Access token refreshed" } },
      },
    },
    "/auth/logout": {
      post: {
        summary: "Logout",
        description: "Revokes the current session and clears the refresh token cookie.",
        responses: { "200": { description: "Logged out" } },
      },
    },
    "/auth/logout-all": {
      post: {
        summary: "Logout from all devices",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "All sessions terminated" } },
      },
    },
    "/auth/forgot-password": {
      post: {
        summary: "Request a password reset email",
        responses: { "200": { description: "Always returns success" } },
      },
    },
    "/auth/reset-password": {
      post: {
        summary: "Reset password using a reset token",
        responses: { "200": { description: "Password reset" } },
      },
    },
    "/auth/me": {
      get: {
        summary: "Get the current authenticated user",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Current user" } },
      },
    },
    "/organizations": {
      post: {
        summary: "Create an organization",
        description: "The creator becomes the OWNER.",
        security: [{ bearerAuth: [] }],
        responses: { "201": { description: "Organization created" } },
      },
      get: {
        summary: "List the current user's organizations",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Organizations with the caller's role in each" } },
      },
    },
    "/organizations/invitations/accept": {
      post: {
        summary: "Accept a pending organization invitation",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Invitation accepted" } },
      },
    },
    "/organizations/invitations/pending": {
      get: {
        summary: "List pending invitations addressed to the current user",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Pending invitations" } },
      },
    },
    "/organizations/invitations/{invitationId}/decline": {
      post: {
        summary: "Decline a pending organization invitation",
        description: "Must be addressed to the current user's email.",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Invitation declined" } },
      },
    },
    "/organizations/{organizationId}": {
      get: {
        summary: "Get an organization",
        description: "Requires membership.",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Organization" }, "404": { description: "Not found" } },
      },
      patch: {
        summary: "Update an organization",
        description: "OWNER or ADMIN only.",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Organization updated" } },
      },
      delete: {
        summary: "Delete an organization",
        description: "OWNER only. Soft delete.",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Organization deleted" } },
      },
    },
    "/organizations/{organizationId}/members": {
      get: {
        summary: "List organization members",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Members" } },
      },
      post: {
        summary: "Invite a member",
        description: "OWNER or ADMIN only. OWNER role cannot be assigned this way.",
        security: [{ bearerAuth: [] }],
        responses: { "201": { description: "Invitation sent" } },
      },
    },
    "/organizations/{organizationId}/members/{memberId}/role": {
      patch: {
        summary: "Update a member's role",
        description: "OWNER or ADMIN only. The Owner's role can never be changed here.",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Role updated" } },
      },
    },
    "/organizations/{organizationId}/members/{memberId}": {
      delete: {
        summary: "Remove a member",
        description: "OWNER or ADMIN only. Cannot remove the Owner or yourself.",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Member removed" } },
      },
    },
    "/workspaces": {
      post: {
        summary: "Create a workspace",
        description: "OWNER, ADMIN or MANAGER of the organization. The creator becomes its first member.",
        security: [{ bearerAuth: [] }],
        responses: { "201": { description: "Workspace created" } },
      },
      get: {
        summary: "List workspaces in an organization",
        description: "Requires organization membership. Pass ?organizationId=",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Workspaces" } },
      },
    },
    "/workspaces/{workspaceId}": {
      get: {
        summary: "Get a workspace",
        description: "Requires membership of its organization.",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Workspace" }, "404": { description: "Not found" } },
      },
      patch: {
        summary: "Update a workspace",
        description: "OWNER, ADMIN or MANAGER only. Name/description only — rejected if archived.",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Workspace updated" } },
      },
      delete: {
        summary: "Delete a workspace",
        description: "OWNER or ADMIN only. Soft delete.",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Workspace deleted" } },
      },
    },
    "/workspaces/{workspaceId}/archive": {
      patch: {
        summary: "Archive a workspace",
        description: "OWNER or ADMIN only. Archived workspaces become read-only.",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Workspace archived" } },
      },
    },
    "/workspaces/{workspaceId}/members": {
      get: {
        summary: "List workspace members",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Members" } },
      },
      post: {
        summary: "Add a workspace member",
        description: "OWNER, ADMIN or MANAGER only. The user must already belong to the organization.",
        security: [{ bearerAuth: [] }],
        responses: { "201": { description: "Member added" } },
      },
    },
    "/workspaces/{workspaceId}/members/{memberId}": {
      delete: {
        summary: "Remove a workspace member",
        description: "OWNER, ADMIN or MANAGER only.",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Member removed" } },
      },
    },
    "/organizations/{organizationId}/workspaces/{workspaceId}/projects": {
      post: {
        summary: "Create a project",
        description: "OWNER, ADMIN or MANAGER only. Rejected if the workspace is archived.",
        security: [{ bearerAuth: [] }],
        responses: { "201": { description: "Project created" } },
      },
      get: {
        summary: "List projects in a workspace",
        description: "Paginated. Query: page, limit, status, sortBy, order.",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Paginated projects" } },
      },
    },
    "/organizations/{organizationId}/workspaces/{workspaceId}/projects/{projectId}": {
      get: {
        summary: "Get a project",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Project" }, "404": { description: "Not found" } },
      },
      patch: {
        summary: "Update a project",
        description:
          "OWNER, ADMIN or MANAGER only. Also used to archive (status: ARCHIVED). Rejected if already archived, or if status is set back to PLANNING from COMPLETED.",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Project updated" } },
      },
      delete: {
        summary: "Delete a project",
        description: "OWNER or ADMIN only. Soft delete.",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Project deleted" } },
      },
    },
    "/projects/{projectId}/labels": {
      post: {
        summary: "Create a label",
        description: "OWNER, ADMIN or MANAGER only.",
        security: [{ bearerAuth: [] }],
        responses: { "201": { description: "Label created" } },
      },
      get: {
        summary: "List labels for a project",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Labels" } },
      },
    },
    "/projects/{projectId}/labels/{labelId}": {
      patch: {
        summary: "Update a label",
        description: "OWNER, ADMIN or MANAGER only.",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Label updated" } },
      },
      delete: {
        summary: "Delete a label",
        description: "OWNER, ADMIN or MANAGER only. Hard delete.",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Label deleted" } },
      },
    },
    "/projects/{projectId}/tasks": {
      post: {
        summary: "Create a task",
        description: "OWNER, ADMIN, MANAGER or MEMBER. Rejected if the project is archived.",
        security: [{ bearerAuth: [] }],
        responses: { "201": { description: "Task created" } },
      },
      get: {
        summary: "List root tasks in a project",
        description: "Paginated. Query: page, limit, status, priority, assigneeId, labelId, dueDate, sortBy, order. Excludes subtasks — see the /subtasks endpoint.",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Paginated tasks" } },
      },
    },
    "/projects/{projectId}/tasks/{taskId}": {
      get: {
        summary: "Get a task",
        description: "Includes populated labels and direct subtasks. 404 if soft-deleted.",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Task" }, "404": { description: "Not found" } },
      },
      patch: {
        summary: "Update a task",
        description:
          "OWNER, ADMIN, MANAGER or MEMBER. Also used to reassign, change status, set labels, and restore ({ isDeleted: false } on a deleted task — the only accepted input while deleted). Rejected if archived.",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Task updated" } },
      },
      delete: {
        summary: "Delete a task",
        description: "OWNER, ADMIN or MANAGER. Soft delete. 404 if already deleted.",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Task deleted" } },
      },
    },
    "/projects/{projectId}/tasks/{taskId}/subtasks": {
      get: {
        summary: "List a task's subtasks",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Subtasks" } },
      },
      post: {
        summary: "Create a subtask",
        description: "OWNER, ADMIN, MANAGER or MEMBER. parentTaskId is set automatically.",
        security: [{ bearerAuth: [] }],
        responses: { "201": { description: "Subtask created" } },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
  },
};
