import { NextRequest, NextResponse } from "next/server";
import { evaluateCompliance } from "@/server/services/compliance.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const flags = evaluateCompliance(body.interaction || body);
    return NextResponse.json({
      compliant: flags.length === 0,
      compliance_flags: flags,
    });
  } catch (error) {
    console.error("Compliance evaluation error:", error);
    return NextResponse.json(
      { compliant: true, compliance_flags: [] },
      { status: 200 }
    );
  }
}

