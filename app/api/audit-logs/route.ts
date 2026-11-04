import { NextRequest, NextResponse } from "next/server";
import { listAuditLogs } from "@/server/services/audit.service";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session.user) {
      return NextResponse.json({ message: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get("entity_type") || undefined;
    const entityId = searchParams.get("entity_id") || undefined;
    const userId = searchParams.get("user_id") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50;

    const logs = await listAuditLogs({
      entityType,
      entityId,
      userId,
      limit,
    });

    return NextResponse.json(logs);
  } catch (error: any) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json(
      { message: error?.message || "Failed to retrieve audit trail" },
      { status: 500 }
    );
  }
}
