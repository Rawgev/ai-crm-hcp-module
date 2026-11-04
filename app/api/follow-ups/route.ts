import { NextRequest, NextResponse } from "next/server";
import { createFollowUp, listFollowUps, recommendActions } from "@/server/services/follow-up.service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const hcpId = searchParams.get("hcp_id") || undefined;
    const followUps = await listFollowUps(hcpId);
    return NextResponse.json(followUps);
  } catch (error) {
    console.error("Error listing follow-ups:", error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === "recommend") {
      const recommendations = recommendActions(body.interaction || {});
      return NextResponse.json(recommendations);
    }

    const created = await createFollowUp({
      interactionId: body.interaction_id,
      hcpId: body.hcp_id || "hcp_1001",
      hcpName: body.hcp_name || "Selected HCP",
      reason: body.reason || "Scheduled follow-up",
      dueDate: body.due_date || new Date().toISOString().slice(0, 10),
      status: body.status || "proposed",
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error("Error creating follow-up:", error);
    return NextResponse.json({ message: error.message || "Invalid payload" }, { status: 400 });
  }
}

