/**
 * Request logging middleware
 * Logs all requests with timing and context
 */

import { Request, Response, NextFunction } from "express";
import { createLogger } from "../utils/logger";

// Store request context
declare global {
  namespace Express {
    interface Request {
      id: string;
      logger: ReturnType<typeof createLogger>;
      startTime: number;
    }
  }
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Logging middleware
 */
export function loggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Generate request ID
  const requestId = generateRequestId();
  req.id = requestId;

  // Create logger with request context
  req.logger = createLogger({
    request_id: requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    user_agent: req.get("User-Agent"),
  });

  // Record start time
  req.startTime = Date.now();

  // Log incoming request
  req.logger.debug("Request received", {
    query: req.query,
    body: sanitizeBody(req.body),
  });

  // Capture the original send function
  const originalSend = res.send;

  // Override send to log response
  res.send = function (data: any) {
    const duration = Date.now() - req.startTime;
    const statusCode = res.statusCode;

    // Log response
    req.logger.info("Request completed", {
      status_code: statusCode,
      duration_ms: duration,
      response_size: data ? data.length : 0,
    });

    // Call original send
    return originalSend.call(this, data);
  };

  next();
}

/**
 * Sanitize request body to remove sensitive information
 */
function sanitizeBody(body: any): any {
  if (!body) return body;

  const sanitized = { ...body };
  const sensitiveKeys = [
    "password",
    "token",
    "secret",
    "signature",
    "private_key",
    "api_key",
  ];

  sensitiveKeys.forEach((key) => {
    if (key in sanitized) {
      sanitized[key] = "[REDACTED]";
    }
  });

  return sanitized;
}

/**
 * Error logging middleware
 */
export function errorLoggingMiddleware(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const statusCode = (res.statusCode as number) || 500;
  const logger = req.logger || createLogger();

  logger.error("Request error", err, {
    status_code: statusCode,
    duration_ms: Date.now() - (req.startTime || Date.now()),
  });

  // Don't call next() - let the main error handler take it
}
