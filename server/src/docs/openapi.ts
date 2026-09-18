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
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
  },
};
