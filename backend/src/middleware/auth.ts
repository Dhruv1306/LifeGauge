import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { AuthenticatedRequest, AuthUserPayload } from "../types";

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      error: {
        code: "AUTH_TOKEN_REQUIRED",
        message: "Authentication token required. Please log in.",
      },
    });
    return;
  }

  const token = authHeader.substring(7).trim();

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AuthUserPayload;
    req.user = {
      id: decoded.id,
      email: decoded.email,
    };
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: {
        code: "AUTH_TOKEN_INVALID",
        message: "Invalid or expired session token. Please log in again.",
      },
    });
  }
}

export function requireCronSecret(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const secretHeader = req.headers["x-cron-secret"];

  if (!secretHeader || secretHeader !== config.cronSecret) {
    res.status(403).json({
      success: false,
      error: {
        code: "AUTH_CRON_SECRET_INVALID",
        message: "Unauthorized: Invalid or missing cron secret.",
      },
    });
    return;
  }

  next();
}
