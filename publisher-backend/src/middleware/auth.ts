import { Request, Response, NextFunction } from "express";

/**
 * Authentication middleware
 * Validates API keys and bearer tokens
 */

// Valid API keys (should be stored in secure env var)
const VALID_API_KEYS = new Set([
  process.env.PUBLISHER_API_KEY || "test-key-123",
  process.env.SDK_API_KEY || "sdk-key-456",
]);

export interface AuthenticatedRequest extends Request {
  authenticated: boolean;
  clientId?: string;
}

/**
 * Validate API key from header
 */
export function apiKeyAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  const apiKey = req.headers["x-api-key"] as string;

  if (!apiKey) {
    res.status(401).json({
      error: "Missing API key",
      code: "MISSING_API_KEY",
    });
    return;
  }

  if (!VALID_API_KEYS.has(apiKey)) {
    res.status(403).json({
      error: "Invalid API key",
      code: "INVALID_API_KEY",
    });
    return;
  }

  req.authenticated = true;
  req.clientId = apiKey;
  next();
}

/**
 * Validate bearer token from Authorization header
 */
export function bearerTokenAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization as string;

  if (!authHeader) {
    res.status(401).json({
      error: "Missing Authorization header",
      code: "MISSING_AUTH_HEADER",
    });
    return;
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
    res.status(401).json({
      error: "Invalid Authorization header format",
      code: "INVALID_AUTH_FORMAT",
    });
    return;
  }

  const token = parts[1];

  // TODO: Validate token (JWT, custom token, etc.)
  if (!validateToken(token)) {
    res.status(403).json({
      error: "Invalid token",
      code: "INVALID_TOKEN",
    });
    return;
  }

  req.authenticated = true;
  req.clientId = extractClientFromToken(token);
  next();
}

/**
 * Optional authentication - doesn't block if missing
 */
export function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  const apiKey = req.headers["x-api-key"] as string;
  const authHeader = req.headers.authorization as string;

  req.authenticated = false;

  if (apiKey && VALID_API_KEYS.has(apiKey)) {
    req.authenticated = true;
    req.clientId = apiKey;
  } else if (authHeader) {
    const parts = authHeader.split(" ");
    if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
      const token = parts[1];
      if (validateToken(token)) {
        req.authenticated = true;
        req.clientId = extractClientFromToken(token);
      }
    }
  }

  next();
}

/**
 * Require authentication
 */
export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  if (!req.authenticated) {
    res.status(401).json({
      error: "Authentication required",
      code: "UNAUTHENTICATED",
    });
    return;
  }

  next();
}

/**
 * Validate token format and signature
 * TODO: Implement actual token validation
 */
function validateToken(token: string): boolean {
  // Placeholder: In production, validate JWT or custom token
  // Check signature, expiry, etc.
  return token.length > 20;
}

/**
 * Extract client ID from token
 * TODO: Implement actual extraction
 */
function extractClientFromToken(token: string): string {
  // Placeholder: In production, decode JWT and extract client
  return token.substring(0, 10);
}

/**
 * Rate limiting by API key
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function rateLimitByKey(
  maxRequests: number = 100,
  windowMs: number = 60000,
) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): void => {
    const key = req.clientId || req.ip || "unknown";
    const now = Date.now();

    let counter = requestCounts.get(key);

    if (!counter || now > counter.resetTime) {
      counter = {
        count: 1,
        resetTime: now + windowMs,
      };
    } else {
      counter.count++;
    }

    requestCounts.set(key, counter);

    // Add rate limit info to response headers
    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader(
      "X-RateLimit-Remaining",
      Math.max(0, maxRequests - counter.count),
    );
    res.setHeader("X-RateLimit-Reset", Math.ceil(counter.resetTime / 1000));

    if (counter.count > maxRequests) {
      res.status(429).json({
        error: "Too many requests",
        code: "RATE_LIMITED",
        retryAfter: Math.ceil((counter.resetTime - now) / 1000),
      });
      return;
    }

    next();
  };
}

/**
 * Clean up old rate limit counters
 */
export function cleanupRateLimiters(): void {
  const now = Date.now();
  for (const [key, counter] of requestCounts.entries()) {
    if (now > counter.resetTime) {
      requestCounts.delete(key);
    }
  }
}

// Run cleanup periodically
setInterval(cleanupRateLimiters, 60000);
