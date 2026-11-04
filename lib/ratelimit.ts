import { NextRequest, NextResponse } from "next/server";

export interface RateLimitConfig {
  limit: number; // Maximum allowed requests
  windowMs: number; // Time window in milliseconds
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
  retryAfterSeconds: number;
}

interface RequestRecord {
  timestamps: number[];
}

// In-memory sliding window store
const rateLimitStore = new Map<string, RequestRecord>();

export const RATE_LIMIT_BUCKETS = {
  AI_CHAT: { limit: 20, windowMs: 60 * 1000 }, // 20 requests per minute
  INTERACTIONS: { limit: 60, windowMs: 60 * 1000 }, // 60 requests per minute
  AUTH: { limit: 10, windowMs: 60 * 1000 }, // 10 attempts per minute
  DEFAULT: { limit: 100, windowMs: 60 * 1000 }, // 100 requests per minute
} as const;

/**
 * Extracts client IP or user identity for rate limit bucket keying.
 */
export function extractClientIdentifier(req: NextRequest, userId?: string | null): string {
  if (userId) {
    return `user:${userId}`;
  }

  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const ip = forwardedFor.split(",")[0].trim();
    if (ip) return `ip:${ip}`;
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return `ip:${realIp.trim()}`;
  }

  return "ip:127.0.0.1";
}

/**
 * Checks sliding window rate limit for a client key in a specific bucket.
 */
export function checkRateLimit(
  clientKey: string,
  config: RateLimitConfig = RATE_LIMIT_BUCKETS.DEFAULT
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - config.windowMs;

  const record = rateLimitStore.get(clientKey) || { timestamps: [] };

  // Filter timestamps outside current sliding window
  const recentTimestamps = record.timestamps.filter((ts) => ts > windowStart);

  if (recentTimestamps.length >= config.limit) {
    const oldestInWindow = recentTimestamps[0] || windowStart;
    const resetMs = oldestInWindow + config.windowMs - now;
    const retryAfterSeconds = Math.max(1, Math.ceil(resetMs / 1000));

    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      resetMs,
      retryAfterSeconds,
    };
  }

  // Record this request
  recentTimestamps.push(now);
  rateLimitStore.set(clientKey, { timestamps: recentTimestamps });

  const remaining = config.limit - recentTimestamps.length;
  const oldestInWindow = recentTimestamps[0] || now;
  const resetMs = Math.max(0, oldestInWindow + config.windowMs - now);
  const retryAfterSeconds = Math.ceil(resetMs / 1000);

  return {
    success: true,
    limit: config.limit,
    remaining,
    resetMs,
    retryAfterSeconds,
  };
}

/**
 * Builds standard RFC 6585 rate limit response with HTTP 429 Too Many Requests
 */
export function buildRateLimitExceededResponse(result: RateLimitResult): NextResponse {
  const resetTimestamp = Math.ceil((Date.now() + result.resetMs) / 1000);

  return NextResponse.json(
    {
      success: false,
      message: `Too many requests. Rate limit exceeded (${result.limit} requests per minute). Please try again in ${result.retryAfterSeconds} seconds.`,
      retryAfter: result.retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(resetTimestamp),
      },
    }
  );
}

/**
 * Clears in-memory rate limit store (utility for testing)
 */
export function clearRateLimits(): void {
  rateLimitStore.clear();
}

