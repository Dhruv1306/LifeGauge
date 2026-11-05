import { Request, Response, NextFunction } from "express";

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// In-memory IP tracking store
const store = new Map<string, RateLimitRecord>();

// Cleanup expired entries every 5 minutes
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, record] of store.entries()) {
    if (now > record.resetTime) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

// Allow Node to exit cleanly if this timer is active
if (cleanupTimer.unref) {
  cleanupTimer.unref();
}

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  code?: string;
}

export function createRateLimiter(options: RateLimitOptions) {
  const {
    windowMs,
    max,
    message = "Too many login attempts. Please try again in 15 minutes.",
    code = "AUTH_RATE_LIMITED",
  } = options;

  return function rateLimiter(req: Request, res: Response, next: NextFunction): void {
    const rawIp =
      req.ip ||
      (req.headers["x-forwarded-for"] as string) ||
      req.socket.remoteAddress ||
      "127.0.0.1";
    const ip = rawIp.toString().split(",")[0].trim();
    const now = Date.now();

    const record = store.get(ip);

    if (!record || now > record.resetTime) {
      store.set(ip, {
        count: 1,
        resetTime: now + windowMs,
      });
      res.setHeader("X-RateLimit-Limit", max);
      res.setHeader("X-RateLimit-Remaining", max - 1);
      res.setHeader("X-RateLimit-Reset", Math.ceil((now + windowMs) / 1000));
      return next();
    }

    if (record.count >= max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
      res.setHeader("Retry-After", retryAfterSeconds);
      res.setHeader("X-RateLimit-Limit", max);
      res.setHeader("X-RateLimit-Remaining", 0);
      res.setHeader("X-RateLimit-Reset", Math.ceil(record.resetTime / 1000));

      res.status(429).json({
        success: false,
        error: {
          code,
          message,
        },
      });
      return;
    }

    record.count += 1;
    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, max - record.count));
    res.setHeader("X-RateLimit-Reset", Math.ceil(record.resetTime / 1000));
    next();
  };
}

// 5 attempts per 15-minute sliding window on login
export const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many login attempts. Please try again in 15 minutes.",
  code: "AUTH_RATE_LIMITED",
});

// Helper for test suites
export function resetRateLimitStore(): void {
  store.clear();
}
