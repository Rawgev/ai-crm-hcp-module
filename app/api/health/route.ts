import { NextResponse } from "next/server";
import { getAppConfig } from "@/lib/config";
import { getRecentExceptions } from "@/lib/telemetry";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = getAppConfig();
  const memory = process.memoryUsage();
  const recentErrors = getRecentExceptions();

  return NextResponse.json({
    status: "ok",
    service: "ai-crm-api",
    runtime: "nextjs-fullstack",
    environment: process.env.NODE_ENV || "development",
    model: config.GROQ_MODEL,
    contextModel: config.GROQ_CONTEXT_MODEL,
    uptimeSeconds: Math.floor(process.uptime()),
    memory: {
      rssMb: Math.round(memory.rss / (1024 * 1024)),
      heapUsedMb: Math.round(memory.heapUsed / (1024 * 1024)),
      heapTotalMb: Math.round(memory.heapTotal / (1024 * 1024)),
    },
    telemetry: {
      errorCount: recentErrors.length,
      lastError: recentErrors[0] ? { name: recentErrors[0].name, timestamp: recentErrors[0].timestamp } : null,
    },
    timestamp: new Date().toISOString(),
  });
}
