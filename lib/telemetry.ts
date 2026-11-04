import { randomUUID } from "node:crypto";
import { logger } from "./logger";

export interface TelemetryContext {
  userId?: string | null;
  userName?: string | null;
  userRole?: string | null;
  path?: string;
  method?: string;
  requestId?: string;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface CapturedException {
  id: string;
  timestamp: string;
  name: string;
  message: string;
  stack?: string;
  context?: TelemetryContext;
  environment: string;
}

// In-memory telemetry buffer for production health diagnostics
const recentExceptionsBuffer: CapturedException[] = [];

/**
 * Centralized error tracking client (Phase 4).
 * Captures unhandled exceptions, database connection errors, and AI timeouts.
 * Integrates with Sentry when SENTRY_DSN is present.
 */
export function captureException(error: unknown, context?: TelemetryContext): string {
  const exceptionId = randomUUID();
  const timestamp = new Date().toISOString();

  let name = "Error";
  let message = "Unknown error";
  let stack: string | undefined;

  if (error instanceof Error) {
    name = error.name;
    message = error.message;
    stack = error.stack;
  } else if (typeof error === "string") {
    message = error;
  } else if (error && typeof error === "object") {
    message = JSON.stringify(error);
  }

  const record: CapturedException = {
    id: exceptionId,
    timestamp,
    name,
    message,
    stack,
    context,
    environment: process.env.NODE_ENV || "development",
  };

  recentExceptionsBuffer.unshift(record);
  if (recentExceptionsBuffer.length > 50) {
    recentExceptionsBuffer.pop();
  }

  // Log structured error
  logger.error(`[Telemetry ${exceptionId}] ${name}: ${message}`, error, {
    exceptionId,
    ...context,
  });

  // If SENTRY_DSN is configured in production, send to Sentry API
  const dsn = process.env.SENTRY_DSN;
  if (dsn && process.env.NODE_ENV === "production") {
    trySendToSentry(dsn, record).catch((sentryErr) => {
      logger.warn("Could not dispatch event to Sentry DSN:", { error: String(sentryErr) });
    });
  }

  return exceptionId;
}

/**
 * Lightweight HTTP payload sender for Sentry DSN without requiring heavyweight SDK bundle
 */
async function trySendToSentry(dsn: string, record: CapturedException): Promise<void> {
  try {
    const url = new URL(dsn);
    const key = url.username;
    const projectId = url.pathname.replace(/^\//, "");
    if (!key || !projectId) return;

    const endpoint = `https://${url.host}/api/${projectId}/store/`;

    await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${key}, sentry_client=ai-crm-hcp/2.0.0`,
      },
      body: JSON.stringify({
        event_id: record.id.replace(/-/g, ""),
        timestamp: record.timestamp,
        level: "error",
        platform: "javascript",
        environment: record.environment,
        exception: {
          values: [
            {
              type: record.name,
              value: record.message,
              stacktrace: record.stack ? { frames: [{ filename: "app", function: record.stack.slice(0, 500) }] } : undefined,
            },
          ],
        },
        tags: record.context?.tags,
        user: record.context?.userId
          ? {
              id: record.context.userId,
              username: record.context.userName || undefined,
            }
          : undefined,
        extra: {
          path: record.context?.path,
          method: record.context?.method,
          ...record.context?.extra,
        },
      }),
    });
  } catch {
    // Fail silently so error reporting never crashes the core app
  }
}

/**
 * Captures an informational or warning message to the telemetry stream.
 */
export function captureMessage(message: string, level: "info" | "warning" | "error" = "info", context?: TelemetryContext): void {
  if (level === "error") {
    logger.error(message, undefined, context as Record<string, unknown>);
  } else if (level === "warning") {
    logger.warn(message, context as Record<string, unknown>);
  } else {
    logger.info(message, context as Record<string, unknown>);
  }
}

/**
 * Returns recent exceptions buffer for health checks and diagnostics.
 */
export function getRecentExceptions(): CapturedException[] {
  return [...recentExceptionsBuffer];
}

/**
 * Clears the telemetry buffer (utility for testing).
 */
export function clearTelemetryBuffer(): void {
  recentExceptionsBuffer.length = 0;
}
