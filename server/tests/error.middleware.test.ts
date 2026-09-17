import { describe, it, expect, vi } from "vitest";
import type { Response } from "express";
import { errorMiddleware } from "../src/middleware/error.middleware.js";
import { AppError } from "../src/utils/AppError.js";

const createMockResponse = (): Response => {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe("errorMiddleware", () => {
  it("uses the AppError status code and message", () => {
    const res = createMockResponse();
    const error = new AppError("Email is already registered", 409);

    errorMiddleware(error, {} as never, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Email is already registered",
    });
  });

  it("falls back to 500 for unexpected errors and hides the raw message", () => {
    const res = createMockResponse();
    const error = new Error("something exploded");

    errorMiddleware(error, {} as never, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Internal server error",
    });
  });
});

describe("AppError", () => {
  it("carries the provided message and status code", () => {
    const error = new AppError("Not found", 404);

    expect(error.message).toBe("Not found");
    expect(error.statusCode).toBe(404);
    expect(error).toBeInstanceOf(Error);
  });
});
