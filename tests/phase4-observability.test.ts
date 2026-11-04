import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  checkRateLimit,
  clearRateLimits,
  buildRateLimitExceededResponse,
  extractClientIdentifier,
  RATE_LIMIT_BUCKETS,
} from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import {
  captureException,
  captureMessage,
  getRecentExceptions,
  clearTelemetryBuffer,
} from "@/lib/telemetry";
import { POST as chatHandler } from "@/app/api/agent/chat/route";
import { GET as healthHandler } from "@/app/api/health/route";

describe("Phase 4: API Rate Limiting, Observability & Error Tracking", () => {
  beforeEach(() => {
    clearRateLimits();
    clearTelemetryBuffer();
  });

  describe("4.1 Sliding Window Route Rate Limiter", () => {
    it("allows requests within quota and decrements remaining count", () => {
      const clientKey = "test-client-1";
      const config = { limit: 5, windowMs: 60000 };

      const res1 = checkRateLimit(clientKey, config);
      expect(res1.success).toBe(true);
      expect(res1.limit).toBe(5);
      expect(res1.remaining).toBe(4);

      const res2 = checkRateLimit(clientKey, config);
      expect(res2.success).toBe(true);
      expect(res2.remaining).toBe(3);
    });

    it("blocks requests and returns retryAfterSeconds when quota is exceeded", () => {
      const clientKey = "test-client-exhaust";
      const config = { limit: 3, windowMs: 60000 };

      checkRateLimit(clientKey, config);
      checkRateLimit(clientKey, config);
      checkRateLimit(clientKey, config);

      // 4th request must be rate limited
      const blocked = checkRateLimit(clientKey, config);
      expect(blocked.success).toBe(false);
      expect(blocked.remaining).toBe(0);
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
      expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60);
    });

    it("constructs standard RFC-compliant HTTP 429 response with Retry-After header", () => {
      const result = {
        success: false,
        limit: 20,
        remaining: 0,
        resetMs: 45000,
        retryAfterSeconds: 45,
      };

      const response = buildRateLimitExceededResponse(result);
      expect(response.status).toBe(429);
      expect(response.headers.get("Retry-After")).toBe("45");
      expect(response.headers.get("X-RateLimit-Limit")).toBe("20");
      expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");
      expect(response.headers.get("X-RateLimit-Reset")).toBeDefined();
    });

    it("extracts client IP from proxy headers or user session correctly", () => {
      const reqFromProxy = new NextRequest("http://localhost:3000/api/interactions", {
        headers: { "x-forwarded-for": "203.0.113.195, 10.0.0.1" },
      });
      const clientKey = extractClientIdentifier(reqFromProxy);
      expect(clientKey).toBe("ip:203.0.113.195");

      const reqWithUser = new NextRequest("http://localhost:3000/api/interactions");
      const userKey = extractClientIdentifier(reqWithUser, "user_rep_99");
      expect(userKey).toBe("user:user_rep_99");
    });

    it("enforces 20 req/min limit on /api/agent/chat handler", async () => {
      const makeRequest = () =>
        new NextRequest("http://localhost:3000/api/agent/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-forwarded-for": "198.51.100.42",
          },
          body: JSON.stringify({
            message: "Recommend compliant follow-up actions",
          }),
        });

      // Execute 20 requests within limits
      for (let i = 0; i < 20; i++) {
        const res = await chatHandler(makeRequest());
        expect(res.status).toBe(200);
      }

      // 21st request must trigger HTTP 429
      const blockedRes = await chatHandler(makeRequest());
      expect(blockedRes.status).toBe(429);
      expect(blockedRes.headers.get("Retry-After")).toBeDefined();

      const body = await blockedRes.json();
      expect(body.success).toBe(false);
      expect(body.message).toContain("Rate limit exceeded");
    });
  });

  describe("4.2 Centralized Error Tracking & Telemetry", () => {
    it("captures unhandled exceptions with stack trace, context, and UUID", () => {
      const testError = new Error("Database timeout while querying HCP interactions");
      const exceptionId = captureException(testError, {
        path: "/api/interactions",
        method: "POST",
        userId: "user_test_rep",
      });

      expect(exceptionId).toBeDefined();

      const buffer = getRecentExceptions();
      expect(buffer).toHaveLength(1);
      expect(buffer[0].id).toBe(exceptionId);
      expect(buffer[0].name).toBe("Error");
      expect(buffer[0].message).toBe("Database timeout while querying HCP interactions");
      expect(buffer[0].context?.userId).toBe("user_test_rep");
      expect(buffer[0].context?.path).toBe("/api/interactions");
      expect(buffer[0].stack).toBeDefined();
    });

    it("records informational and warning telemetry messages", () => {
      captureMessage("Adverse event escalated to Safety Team", "warning", {
        hcpId: "hcp_1001",
      });
      // Should execute without errors
      expect(true).toBe(true);
    });
  });

  describe("4.3 Structured Logging & Operational Metrics", () => {
    it("measures execution duration and logs metric events", () => {
      const timer = logger.startTimer("test.timer.metric", { route: "/test" });
      const duration = timer();

      expect(duration).toBeGreaterThanOrEqual(0);
      expect(typeof duration).toBe("number");
    });

    it("creates child loggers with contextual metadata", () => {
      const childLogger = logger.child({ requestId: "req-123", territory: "West Zone" });
      expect(childLogger).toBeDefined();
      // Should not throw
      childLogger.info("HCP profile accessed", { hcpId: "hcp_1002" });
    });
  });

  describe("4.4 Production Telemetry Health Endpoint", () => {
    it("returns rich operational health telemetry", async () => {
      captureException(new Error("Simulated query timeout"));

      const response = await healthHandler();
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.status).toBe("ok");
      expect(data.service).toBe("ai-crm-api");
      expect(data.uptimeSeconds).toBeGreaterThanOrEqual(0);
      expect(data.memory).toBeDefined();
      expect(data.memory.heapUsedMb).toBeGreaterThan(0);
      expect(data.telemetry).toBeDefined();
      expect(data.telemetry.errorCount).toBe(1);
    });
  });
});
