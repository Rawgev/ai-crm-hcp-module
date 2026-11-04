import { NextRequest, NextResponse } from "next/server";
import { getPharmacovigilanceAlerts } from "@/server/services/compliance.service";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session.user) {
      return NextResponse.json({ message: "Authentication required" }, { status: 401 });
    }

    const alerts = getPharmacovigilanceAlerts();
    return NextResponse.json(alerts);
  } catch (error: any) {
    console.error("Error retrieving pharmacovigilance alerts:", error);
    return NextResponse.json(
      { message: error?.message || "Failed to retrieve safety alerts" },
      { status: 500 }
    );
  }
}

