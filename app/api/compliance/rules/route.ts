import { NextResponse } from "next/server";
import { getComplianceRules } from "@/server/services/compliance.service";

export async function GET() {
  return NextResponse.json({
    rules: getComplianceRules(),
  });
}

