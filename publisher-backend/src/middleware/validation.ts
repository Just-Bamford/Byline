import { Request, Response, NextFunction } from "express";

/**
 * Request validation middleware
 * Validates request payloads against schemas
 */

export interface ValidationSchema {
  [key: string]: {
    required?: boolean;
    type?: "string" | "number" | "boolean" | "object" | "array";
    min?: number;
    max?: number;
    pattern?: RegExp;
    enum?: any[];
    custom?: (value: any) => boolean;
  };
}

/**
 * Create request validator middleware
 */
export function validateRequest(schema: ValidationSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors = validateBody(req.body, schema);

    if (errors.length > 0) {
      res.status(400).json({
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: errors,
      });
      return;
    }

    next();
  };
}

/**
 * Validate request body against schema
 */
function validateBody(body: any, schema: ValidationSchema): string[] {
  const errors: string[] = [];

  for (const [field, rules] of Object.entries(schema)) {
    const value = body[field];

    // Check required
    if (rules.required && (value === undefined || value === null)) {
      errors.push(`${field} is required`);
      continue;
    }

    // Skip validation if not required and missing
    if (!rules.required && (value === undefined || value === null)) {
      continue;
    }

    // Check type
    if (rules.type) {
      const actualType = Array.isArray(value) ? "array" : typeof value;
      if (actualType !== rules.type) {
        errors.push(`${field} must be of type ${rules.type}`);
        continue;
      }
    }

    // Check min/max for strings
    if (rules.type === "string" && typeof value === "string") {
      if (rules.min !== undefined && value.length < rules.min) {
        errors.push(`${field} must be at least ${rules.min} characters`);
      }
      if (rules.max !== undefined && value.length > rules.max) {
        errors.push(`${field} must be at most ${rules.max} characters`);
      }
    }

    // Check min/max for numbers
    if (rules.type === "number" && typeof value === "number") {
      if (rules.min !== undefined && value < rules.min) {
        errors.push(`${field} must be at least ${rules.min}`);
      }
      if (rules.max !== undefined && value > rules.max) {
        errors.push(`${field} must be at most ${rules.max}`);
      }
    }

    // Check pattern
    if (rules.pattern && typeof value === "string") {
      if (!rules.pattern.test(value)) {
        errors.push(`${field} has invalid format`);
      }
    }

    // Check enum
    if (rules.enum && !rules.enum.includes(value)) {
      errors.push(`${field} must be one of: ${rules.enum.join(", ")}`);
    }

    // Custom validation
    if (rules.custom && !rules.custom(value)) {
      errors.push(`${field} failed custom validation`);
    }
  }

  return errors;
}

/**
 * Common validation schemas
 */
export const schemas = {
  verify: {
    token: {
      required: true,
      type: "object" as const,
      custom: (t: any) =>
        t && typeof t === "object" && "reader" in t && "article_id" in t,
    },
    contractId: {
      required: true,
      type: "string" as const,
      pattern: /^C[A-Z0-9]{55}$/,
    },
  } as ValidationSchema,

  recordRead: {
    articleId: {
      required: true,
      type: "string" as const,
      min: 1,
      max: 256,
    },
    readerId: {
      required: true,
      type: "string" as const,
      pattern: /^G[A-Z0-9]{55}$/,
    },
    price: {
      required: true,
      type: "number" as const,
      min: 0,
      max: 1000,
    },
  } as ValidationSchema,

  updatePrice: {
    articleId: {
      required: true,
      type: "string" as const,
      min: 1,
    },
    newPrice: {
      required: true,
      type: "number" as const,
      min: 0,
      max: 1000,
    },
    publisher: {
      required: true,
      type: "string" as const,
      pattern: /^G[A-Z0-9]{55}$/,
    },
  } as ValidationSchema,
};

/**
 * Payload size limit middleware
 */
export function limitPayloadSize(maxSizeKb: number = 100) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.headers["content-length"] || "0", 10);
    const maxSizeBytes = maxSizeKb * 1024;

    if (contentLength > maxSizeBytes) {
      res.status(413).json({
        error: "Payload too large",
        code: "PAYLOAD_TOO_LARGE",
        maxSize: maxSizeBytes,
      });
      return;
    }

    next();
  };
}

/**
 * Query parameter validation
 */
export function validateQuery(schema: ValidationSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors = validateBody(req.query, schema);

    if (errors.length > 0) {
      res.status(400).json({
        error: "Invalid query parameters",
        code: "INVALID_QUERY",
        details: errors,
      });
      return;
    }

    next();
  };
}
