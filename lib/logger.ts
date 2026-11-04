/**
 * Structured Logging & Operational Metrics (Phase 4)
 * Outputs standard NDJSON in production for Datadog / CloudWatch / LogDNA / Loki,
 * and clean readable logging in development.
 */

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  environment: string;
  meta?: Record<string, unknown>;
  error?: {
    name?: string;
    message: string;
    stack?: string;
  };
}

export interface MetricEntry {
  timestamp: string;
  type: "METRIC";
  metric: string;
  value: number;
  unit: string;
  tags?: Record<string, unknown>;
}

class StructuredLogger {
  private serviceName: string = "ai-crm-hcp-module";
  private defaultMeta: Record<string, unknown> = {};

  constructor(defaultMeta: Record<string, unknown> = {}) {
    this.defaultMeta = defaultMeta;
  }

  child(meta: Record<string, unknown>): StructuredLogger {
    return new StructuredLogger({ ...this.defaultMeta, ...meta });
  }

  private write(level: LogLevel, message: string, meta?: Record<string, unknown>, error?: unknown): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.serviceName,
      environment: process.env.NODE_ENV || "development",
      meta: { ...this.defaultMeta, ...meta },
    };

    if (error) {
      if (error instanceof Error) {
        entry.error = {
          name: error.name,
          message: error.message,
          stack: error.stack,
        };
      } else {
        entry.error = {
          message: String(error),
        };
      }
    }

    if (process.env.NODE_ENV === "production") {
      const serialized = JSON.stringify(entry);
      if (level === "ERROR") {
        console.error(serialized);
      } else if (level === "WARN") {
        console.warn(serialized);
      } else {
        console.log(serialized);
      }
    } else {
      const prefix = `[${entry.timestamp.slice(11, 19)}] [${level}]`;
      if (level === "ERROR") {
        console.error(prefix, message, entry.meta || "", entry.error?.message || "");
      } else if (level === "WARN") {
        console.warn(prefix, message, entry.meta || "");
      } else {
        console.log(prefix, message, entry.meta && Object.keys(entry.meta).length > 0 ? entry.meta : "");
      }
    }
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.write("INFO", message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.write("WARN", message, meta);
  }

  error(message: string, error?: unknown, meta?: Record<string, unknown>): void {
    this.write("ERROR", message, meta, error);
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    if (process.env.NODE_ENV !== "production") {
      this.write("DEBUG", message, meta);
    }
  }

  metric(name: string, value: number, unit: string = "ms", tags?: Record<string, unknown>): void {
    const entry: MetricEntry = {
      timestamp: new Date().toISOString(),
      type: "METRIC",
      metric: name,
      value,
      unit,
      tags: { ...this.defaultMeta, ...tags },
    };

    if (process.env.NODE_ENV === "production") {
      console.log(JSON.stringify(entry));
    } else {
      console.log(`[METRIC] ${name}: ${value}${unit}`, tags || "");
    }
  }

  startTimer(metricName: string, tags?: Record<string, unknown>): () => number {
    const start = performance.now();
    return () => {
      const durationMs = Math.round((performance.now() - start) * 100) / 100;
      this.metric(metricName, durationMs, "ms", tags);
      return durationMs;
    };
  }
}

export const logger = new StructuredLogger();

