import { describe, it, expect, vi } from "vitest";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../src/config";
import { requireAuth, requireCronSecret } from "../src/middleware/auth";
import { AuthenticatedRequest } from "../src/types";
import { Response } from "express";

describe("Milestone 1: Authentication & Security Unit Tests", () => {
  describe("Password Hashing (bcrypt)", () => {
    it("should securely hash passwords and verify them correctly", async () => {
      const password = "mySecretPassword123";
      const hash = await bcrypt.hash(password, 12);

      expect(hash).not.toBe(password);
      expect(hash.startsWith("$2")).toBe(true);

      const isValid = await bcrypt.compare(password, hash);
      expect(isValid).toBe(true);

      const isInvalid = await bcrypt.compare("wrongPassword", hash);
      expect(isInvalid).toBe(false);
    });
  });

  describe("JWT Token Generation & Verification", () => {
    it("should correctly sign and decode Bearer tokens", () => {
      const payload = { id: "user-12345", email: "test@lifegauge.com" };
      const token = jwt.sign(payload, config.jwtSecret, { expiresIn: "7d" });

      const decoded = jwt.verify(token, config.jwtSecret) as typeof payload;
      expect(decoded.id).toBe(payload.id);
      expect(decoded.email).toBe(payload.email);
    });

    it("should fail verification for tampered tokens", () => {
      const payload = { id: "user-12345", email: "test@lifegauge.com" };
      const token = jwt.sign(payload, config.jwtSecret, { expiresIn: "7d" });
      const tampered = token.slice(0, -5) + "abcde";

      expect(() => jwt.verify(tampered, config.jwtSecret)).toThrow();
    });
  });

  describe("requireAuth Middleware", () => {
    it("should reject requests with missing Authorization header (401)", () => {
      const req = { headers: {} } as AuthenticatedRequest;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn();

      requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining("Authentication token required"),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("should reject requests with non-Bearer token (401)", () => {
      const req = {
        headers: { authorization: "Basic 12345" },
      } as AuthenticatedRequest;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn();

      requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it("should reject requests with invalid JWT (401)", () => {
      const req = {
        headers: { authorization: "Bearer invalid.jwt.token" },
      } as AuthenticatedRequest;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn();

      requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining("Invalid or expired session token"),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("should accept valid Bearer token and attach req.user", () => {
      const payload = { id: "user-999", email: "verified@lifegauge.com" };
      const token = jwt.sign(payload, config.jwtSecret, { expiresIn: "1h" });

      const req = {
        headers: { authorization: `Bearer ${token}` },
      } as AuthenticatedRequest;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn();

      requireAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user?.id).toBe(payload.id);
      expect(req.user?.email).toBe(payload.email);
    });
  });

  describe("requireCronSecret Middleware", () => {
    it("should reject requests without X-Cron-Secret header (403)", () => {
      const req = { headers: {} } as AuthenticatedRequest;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn();

      requireCronSecret(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it("should reject requests with wrong X-Cron-Secret header (403)", () => {
      const req = {
        headers: { "x-cron-secret": "wrong-secret" },
      } as AuthenticatedRequest;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn();

      requireCronSecret(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it("should permit requests with valid X-Cron-Secret header", () => {
      const req = {
        headers: { "x-cron-secret": config.cronSecret },
      } as AuthenticatedRequest;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn();

      requireCronSecret(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
