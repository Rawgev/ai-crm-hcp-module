import { NextRequest, NextResponse } from "next/server";
import { loginUser } from "@/server/services/auth.service";
import { loginSchema } from "@/server/validation/auth.schema";
import {
  checkRateLimit,
  extractClientIdentifier,
  buildRateLimitExceededResponse,
  RATE_LIMIT_BUCKETS,
} from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import { captureException } from "@/lib/telemetry";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const clientKey = `auth:${extractClientIdentifier(req)}`;
    const rateLimit = checkRateLimit(clientKey, RATE_LIMIT_BUCKETS.AUTH);
    if (!rateLimit.success) {
      logger.warn("Brute-force login rate limit exceeded", { clientKey, rateLimit });
      return buildRateLimitExceededResponse(rateLimit);
    }

    const body = await req.json();
    const validated = loginSchema.parse(body);
    const result = await loginUser(validated);

    logger.info("User authenticated successfully", {
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
    });

    const response = NextResponse.json(result);
    response.cookies.set("token", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: any) {
    if (error.message === "INVALID_CREDENTIALS") {
      logger.warn("Invalid credentials submitted during login", {
        clientKey: extractClientIdentifier(req),
      });
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 });
    }

    captureException(error, { path: "/api/auth/login", method: "POST" });
    const message = error.errors?.[0]?.message || error.message || "Login failed";
    return NextResponse.json({ message }, { status: 400 });
  }
}
