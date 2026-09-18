import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { User } from "../src/modules/users/user.model.js";

const STRONG_PASSWORD = "StrongPass1!";
const testEmails: string[] = [];

const uniqueEmail = (): string => {
  const email = `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  testEmails.push(email);
  return email;
};

afterAll(async () => {
  await User.deleteMany({ email: { $in: testEmails } });
});

describe("POST /api/v1/auth/register", () => {
  it("registers a new user and leaves the account unverified", async () => {
    const email = uniqueEmail();

    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ name: "Test User", email, password: STRONG_PASSWORD });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ success: true });

    const user = await User.findOne({ email });
    expect(user).not.toBeNull();
    expect(user?.isEmailVerified).toBe(false);
  });

  it("rejects a duplicate email", async () => {
    const email = uniqueEmail();
    await request(app)
      .post("/api/v1/auth/register")
      .send({ name: "Test User", email, password: STRONG_PASSWORD });

    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ name: "Test User", email, password: STRONG_PASSWORD });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it("rejects a weak password", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ name: "Test User", email: uniqueEmail(), password: "weak" });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /api/v1/auth/login", () => {
  it("rejects login before email verification", async () => {
    const email = uniqueEmail();
    await request(app)
      .post("/api/v1/auth/register")
      .send({ name: "Test User", email, password: STRONG_PASSWORD });

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password: STRONG_PASSWORD });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("EMAIL_NOT_VERIFIED");
  });

  it("rejects invalid credentials", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: uniqueEmail(), password: STRONG_PASSWORD });

    expect(res.status).toBe(401);
  });
});

describe("full auth flow", () => {
  it("verifies email, logs in, refreshes, fetches /me, and logs out", async () => {
    const email = uniqueEmail();
    await request(app)
      .post("/api/v1/auth/register")
      .send({ name: "Test User", email, password: STRONG_PASSWORD });

    const user = await User.findOne({ email }).select("+emailVerificationTokenHash");
    expect(user).not.toBeNull();

    // Verification tokens are only ever stored hashed, so the test drives
    // verification directly through the model rather than the raw token.
    await User.findByIdAndUpdate(user!._id, { isEmailVerified: true });

    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password: STRONG_PASSWORD });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.accessToken).toBeTypeOf("string");
    const cookies = loginRes.headers["set-cookie"];
    expect(cookies).toBeDefined();

    const meRes = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${loginRes.body.data.accessToken}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.email).toBe(email);

    const refreshRes = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", cookies);

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.data.accessToken).toBeTypeOf("string");

    const newCookies = refreshRes.headers["set-cookie"];

    const logoutRes = await request(app)
      .post("/api/v1/auth/logout")
      .set("Cookie", newCookies);

    expect(logoutRes.status).toBe(200);

    // The rotated refresh token must be rejected after logout.
    const refreshAfterLogout = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", newCookies);

    expect(refreshAfterLogout.status).toBe(401);
  });
});

describe("POST /api/v1/auth/forgot-password", () => {
  it("always returns success, even for an unknown email", async () => {
    const res = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: uniqueEmail() });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe("GET /api/v1/auth/me", () => {
  it("rejects requests without an access token", async () => {
    const res = await request(app).get("/api/v1/auth/me");

    expect(res.status).toBe(401);
  });
});
