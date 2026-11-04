import { NextRequest, NextResponse } from "next/server";
import { createInteraction, listInteractions } from "@/server/services/interaction.service";
import { interactionCreateSchema } from "@/server/validation/interaction.schema";
import { getSession } from "@/lib/auth/session";
import {
  checkRateLimit,
  extractClientIdentifier,
  buildRateLimitExceededResponse,
  RATE_LIMIT_BUCKETS,
} from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import { captureException } from "@/lib/telemetry";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const hcpId = searchParams.get("hcp_id") || undefined;
    const interactions = await listInteractions(hcpId);
    return NextResponse.json(interactions);
  } catch (error) {
    captureException(error, { path: "/api/interactions", method: "GET" });
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  let sessionUser: any = null;
  try {
    const session = await getSession(req);
    sessionUser = session.user;

    // Rate Limiting (60 requests per minute)
    const clientKey = `interaction:${extractClientIdentifier(req, sessionUser?.id)}`;
    const rateLimit = checkRateLimit(clientKey, RATE_LIMIT_BUCKETS.INTERACTIONS);
    if (!rateLimit.success) {
      logger.warn("Rate limit exceeded on POST /api/interactions", { clientKey, rateLimit });
      return buildRateLimitExceededResponse(rateLimit);
    }

    const endTimer = logger.startTimer("route.latency.interactions_create", { clientKey });

    const body = await req.json();
    const validated = interactionCreateSchema.parse(body);

    const userContext = {
      userId: sessionUser?.id || "user_default_rep",
      userName: sessionUser?.name || "Alex Vance",
      userRole: sessionUser?.role || "REP",
      ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1",
    };

    const interaction = await createInteraction(validated, userContext);

    const latencyMs = endTimer();
    logger.info("Interaction logged successfully", {
      interactionId: interaction.id,
      hcpId: interaction.hcp_id,
      latencyMs,
    });

    return NextResponse.json(interaction, { status: 201 });
  } catch (error: any) {
    captureException(error, {
      path: "/api/interactions",
      method: "POST",
      userId: sessionUser?.id,
    });

    const message = error.errors?.[0]?.message || error.message || "Could not save interaction";
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
