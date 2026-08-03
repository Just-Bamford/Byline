/**
 * Structured logging utility
 * Outputs JSON logs compatible with ELK, Datadog, CloudWatch, etc.
 */

export interface LogContext {
  [key: string]: any;
}

export type LogLevel = "debug" | "info" | "warn" | "error";

class Logger {
  private context: LogContext;
  private environment: string;

  constructor(context: LogContext = {}) {
    this.context = context;
    this.environment = process.env.NODE_ENV || "development";
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): Logger {
    const logger = new Logger({
      ...this.context,
      ...context,
    });
    return logger;
  }

  /**
   * Log at debug level
   */
  debug(message: string, context?: LogContext): void {
    this.log("debug", message, context);
  }

  /**
   * Log at info level
   */
  info(message: string, context?: LogContext): void {
    this.log("info", message, context);
  }

  /**
   * Log at warn level
   */
  warn(message: string, context?: LogContext): void {
    this.log("warn", message, context);
  }

  /**
   * Log at error level
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext = this.formatError(error);
    this.log("error", message, { ...context, ...errorContext });
  }

  /**
   * Private method to perform actual logging
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    const logEntry: any = {
      timestamp: new Date().toISOString(),
      level,
      message,
      environment: this.environment,
      ...this.context,
      ...context,
    };

    // Only log to console if requested (for local development)
    const shouldPrintToConsole =
      process.env.LOG_TO_CONSOLE === "true" ||
      (this.environment === "development" && level !== "debug");

    if (shouldPrintToConsole) {
      const consoleMethod = this.getConsoleMethod(level);
      consoleMethod(JSON.stringify(logEntry));
    } else {
      // Always output JSON to stdout/stderr for log aggregation
      const output = JSON.stringify(logEntry);
      if (level === "error" || level === "warn") {
        console.error(output);
      } else {
        console.log(output);
      }
    }
  }

  /**
   * Format error objects into loggable context
   */
  private formatError(error: Error | unknown): LogContext {
    if (!error) {
      return {};
    }

    if (error instanceof Error) {
      return {
        error_type: error.name,
        error_message: error.message,
        error_stack: error.stack,
      };
    }

    return {
      error: String(error),
    };
  }

  /**
   * Get appropriate console method based on level
   */
  private getConsoleMethod(level: LogLevel): typeof console.log {
    switch (level) {
      case "error":
        return console.error;
      case "warn":
        return console.warn;
      case "debug":
        return console.debug;
      default:
        return console.log;
    }
  }
}

/**
 * Create a root logger instance
 */
export function createLogger(context?: LogContext): Logger {
  return new Logger(context);
}

/**
 * Default logger instance
 */
export const logger = createLogger();
