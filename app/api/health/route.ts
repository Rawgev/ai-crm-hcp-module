import { NextResponse } from "next/server";
import { getAppConfig } from "@/lib/config";

export async function GET() {
  const config = getAppConfig();
  return NextResponse.json({
    status: "ok",
    service: "ai-crm-api",
    runtime: "nextjs-fullstack",
    model: config.GROQ_MODEL,
    timestamp: new Date().toISOString(),
  });
}

