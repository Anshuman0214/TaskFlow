import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app.js";

describe("GET /api/v1/system/health", () => {
  it("reports service connectivity without throwing", async () => {
    const res = await request(app).get("/api/v1/system/health");

    // No live MongoDB/Redis connection in the test environment, so the
    // endpoint must degrade gracefully (503) rather than error out.
    expect([200, 503]).toContain(res.status);
    expect(res.body.data).toMatchObject({
      status: expect.stringMatching(/^(ok|degraded)$/),
      services: {
        database: expect.stringMatching(/^(connected|disconnected)$/),
        redis: expect.stringMatching(/^(connected|disconnected)$/),
      },
    });
    expect(typeof res.body.data.uptime).toBe("number");
  });
});

describe("GET /api/v1/system/info", () => {
  it("returns API metadata", async () => {
    const res = await request(app).get("/api/v1/system/info");

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      name: "TaskFlow API",
      version: "v1",
    });
  });
});
