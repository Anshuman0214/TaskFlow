import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app.js";

describe("GET /api/v1", () => {
  it("returns the API running message", async () => {
    const res = await request(app).get("/api/v1");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      data: { version: "v1" },
    });
  });
});

describe("unknown routes", () => {
  it("returns a standardized 404 response", async () => {
    const res = await request(app).get("/api/v1/does-not-exist");

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false });
    expect(res.body.message).toMatch(/not found/i);
  });
});

describe("security headers", () => {
  it("applies helmet defaults and hides X-Powered-By", async () => {
    const res = await request(app).get("/api/v1");

    expect(res.headers["x-powered-by"]).toBeUndefined();
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });
});

describe("GET /api/docs", () => {
  it("serves the Swagger UI", async () => {
    const res = await request(app).get("/api/docs/");

    expect(res.status).toBe(200);
    expect(res.text).toMatch(/swagger/i);
  });
});
