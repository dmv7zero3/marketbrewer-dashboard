import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";

describe("authMiddleware", () => {
  const OLD_ENV = process.env;
  let warnSpy: jest.SpyInstance;

  const loadMiddleware = async () => {
    jest.resetModules();
    const mod = await import("../middleware/auth");
    return mod;
  };

  const createMocks = () => {
    const req = {
      path: "/api/jobs",
      headers: {},
    } as unknown as AuthenticatedRequest;

    const status = jest.fn().mockReturnThis();
    const json = jest.fn().mockReturnThis();
    const res = { status, json } as unknown as Response;
    const next = jest.fn() as NextFunction;

    return { req, res, next, status, json };
  };

  beforeEach(() => {
    process.env = { ...OLD_ENV, API_TOKEN: "test-token" };
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    process.env = OLD_ENV;
  });

  it("skips auth on health endpoints", async () => {
    const { authMiddleware } = await loadMiddleware();
    const { req, res, next } = createMocks();
    Object.defineProperty(req, "path", { value: "/health" });
    authMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("returns 500 when API_TOKEN is missing", async () => {
    delete process.env.API_TOKEN;
    const { authMiddleware } = await loadMiddleware();
    const { req, res, next, status, json } = createMocks();
    authMiddleware(req, res, next);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      error: "Server configuration error",
      code: "INTERNAL_ERROR",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects missing Authorization header", async () => {
    const { authMiddleware } = await loadMiddleware();
    const { req, res, next, status, json } = createMocks();
    authMiddleware(req, res, next);
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({
      error: "Missing Authorization header",
      code: "UNAUTHORIZED",
    });
  });

  it("rejects bad format", async () => {
    const { authMiddleware } = await loadMiddleware();
    const { req, res, next, status, json } = createMocks();
    req.headers.authorization = "Token abc";
    authMiddleware(req, res, next);
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({
      error: "Invalid Authorization header format. Use: Bearer <token>",
      code: "UNAUTHORIZED",
    });
  });

  it("rejects wrong token", async () => {
    const { authMiddleware } = await loadMiddleware();
    const { req, res, next, status, json } = createMocks();
    req.headers.authorization = "Bearer wrong";
    authMiddleware(req, res, next);
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({
      error: "Invalid API token",
      code: "UNAUTHORIZED",
    });
  });

  it("calls next and sets token on success", async () => {
    const { authMiddleware } = await loadMiddleware();
    const { req, res, next } = createMocks();
    req.headers.authorization = "Bearer test-token";
    authMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.token).toBe("test-token");
  });
});
