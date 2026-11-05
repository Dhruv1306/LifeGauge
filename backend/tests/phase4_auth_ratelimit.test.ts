import { describe, it, expect, vi, beforeEach } from "vitest";
import { login } from "../src/controllers/authController";
import {
  createRateLimiter,
  loginRateLimiter,
  resetRateLimitStore,
} from "../src/middleware/rateLimiter";
import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";
import { AuthenticatedRequest } from "../src/types";
import { Response, Request, NextFunction } from "express";

// Mock Prisma for controller tests
vi.mock("../src/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

function mockResponse() {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.setHeader = vi.fn().mockReturnValue(res);
  return res;
}

describe("Phase 4: Specific Sign-In Errors & Rate Limiting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimitStore();
  });

  describe("Specific Error Messaging in login controller", () => {
    it("should return 401 with AUTH_USER_NOT_FOUND when user does not exist", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const req = {
        body: {
          email: "unknown@lifegauge.com",
          password: "password123",
        },
      } as AuthenticatedRequest;
      const res = mockResponse();

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: "AUTH_USER_NOT_FOUND",
          message: "User doesn't exist.",
        },
      });
    });

    it("should return 401 with AUTH_INCORRECT_PASSWORD when password is incorrect", async () => {
      const realPasswordHash = await bcrypt.hash("correctPassword", 10);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "u-123",
        email: "existing@lifegauge.com",
        passwordHash: realPasswordHash,
        name: "Existing User",
        weightTasks: 40,
        weightFocus: 35,
        weightHabits: 25,
        dailyFocusTargetMin: 120,
        createdAt: new Date(),
        updatedAt: new Date(),
        googleId: null,
      } as any);

      const req = {
        body: {
          email: "existing@lifegauge.com",
          password: "wrongPassword",
        },
      } as AuthenticatedRequest;
      const res = mockResponse();

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: "AUTH_INCORRECT_PASSWORD",
          message: "Incorrect password. Please try again.",
        },
      });
    });

    it("should return 200 with JWT and user object when password is correct", async () => {
      const realPasswordHash = await bcrypt.hash("correctPassword", 10);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "u-123",
        email: "existing@lifegauge.com",
        passwordHash: realPasswordHash,
        name: "Existing User",
        weightTasks: 40,
        weightFocus: 35,
        weightHabits: 25,
        dailyFocusTargetMin: 120,
        createdAt: new Date(),
        updatedAt: new Date(),
        googleId: null,
      } as any);

      const req = {
        body: {
          email: "existing@lifegauge.com",
          password: "correctPassword",
        },
      } as AuthenticatedRequest;
      const res = mockResponse();

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Login successful",
          token: expect.any(String),
          user: expect.objectContaining({
            id: "u-123",
            email: "existing@lifegauge.com",
          }),
        })
      );
    });

    it("should validate input schema and reject invalid email format with 400", async () => {
      const req = {
        body: {
          email: "not-an-email",
          password: "password123",
        },
      } as AuthenticatedRequest;
      const res = mockResponse();

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid email format",
        },
      });
    });
  });

  describe("IP Rate Limiting Middleware", () => {
    it("should allow up to max requests within window and set rate limit headers", () => {
      const limiter = createRateLimiter({
        windowMs: 60 * 1000,
        max: 3,
      });

      const next = vi.fn();
      const ip = "192.168.1.100";

      for (let i = 1; i <= 3; i++) {
        const req = { ip, headers: {}, socket: {} } as Request;
        const res = mockResponse();

        limiter(req, res, next);

        expect(next).toHaveBeenCalledTimes(i);
        expect(res.setHeader).toHaveBeenCalledWith("X-RateLimit-Limit", 3);
        expect(res.setHeader).toHaveBeenCalledWith("X-RateLimit-Remaining", 3 - i);
      }
    });

    it("should reject requests exceeding max limit with 429 and Retry-After header", () => {
      const limiter = createRateLimiter({
        windowMs: 60 * 1000,
        max: 2,
        code: "AUTH_RATE_LIMITED",
        message: "Too many login attempts. Please try again in 15 minutes.",
      });

      const next = vi.fn();
      const ip = "10.0.0.1";

      // 1st request
      limiter({ ip, headers: {}, socket: {} } as Request, mockResponse(), next);
      expect(next).toHaveBeenCalledTimes(1);

      // 2nd request
      limiter({ ip, headers: {}, socket: {} } as Request, mockResponse(), next);
      expect(next).toHaveBeenCalledTimes(2);

      // 3rd request (exceeds limit of 2)
      const res3 = mockResponse();
      limiter({ ip, headers: {}, socket: {} } as Request, res3, next);

      expect(next).toHaveBeenCalledTimes(2); // not called again
      expect(res3.status).toHaveBeenCalledWith(429);
      expect(res3.setHeader).toHaveBeenCalledWith("Retry-After", expect.any(Number));
      expect(res3.setHeader).toHaveBeenCalledWith("X-RateLimit-Remaining", 0);
      expect(res3.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: "AUTH_RATE_LIMITED",
          message: "Too many login attempts. Please try again in 15 minutes.",
        },
      });
    });

    it("should isolate limits per client IP address", () => {
      const limiter = createRateLimiter({
        windowMs: 60 * 1000,
        max: 1,
      });

      const next = vi.fn();

      // IP 1 uses its attempt
      limiter({ ip: "1.1.1.1", headers: {}, socket: {} } as Request, mockResponse(), next);
      expect(next).toHaveBeenCalledTimes(1);

      // IP 2 makes request - should succeed despite IP 1 being maxed out
      limiter({ ip: "2.2.2.2", headers: {}, socket: {} } as Request, mockResponse(), next);
      expect(next).toHaveBeenCalledTimes(2);

      // IP 1 makes second request - should be blocked
      const resBlocked = mockResponse();
      limiter({ ip: "1.1.1.1", headers: {}, socket: {} } as Request, resBlocked, next);
      expect(next).toHaveBeenCalledTimes(2);
      expect(resBlocked.status).toHaveBeenCalledWith(429);
    });
  });
});
