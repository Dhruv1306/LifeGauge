import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

/**
 * Structured error response format used across all API endpoints.
 * { success: false, error: { code: string, message: string, details?: any } }
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  // Log the full technical error to the server (never exposed to clients)
  console.error("[ErrorHandler]", err.message, err.stack);

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "One or more fields are invalid.",
        details: err.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      },
    });
    return;
  }

  // Check for known database connection errors (Prisma/MySQL)
  if (
    err.message?.includes("ECONNREFUSED") ||
    err.message?.includes("Can't reach database") ||
    err.message?.includes("P1001") ||
    err.message?.includes("P1002")
  ) {
    res.status(503).json({
      success: false,
      error: {
        code: "DB_CONNECTION_ERROR",
        message: "The service is temporarily unavailable. Please try again later.",
      },
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong on our end. Please try again.",
    },
  });
}
