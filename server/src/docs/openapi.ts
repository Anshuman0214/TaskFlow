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
  },
};
