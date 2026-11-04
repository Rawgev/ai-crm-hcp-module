import { NextRequest, NextResponse } from "next/server";
import { getHcpById } from "@/server/services/hcp.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const hcp = await getHcpById(params.id);
    if (!hcp) {
      return NextResponse.json({ message: "HCP not found" }, { status: 404 });
    }
    return NextResponse.json({
      id: hcp.id,
      full_name: hcp.fullName,
      specialty: hcp.specialty,
      tier: hcp.tier,
      organization: hcp.organization,
      territory: hcp.territory,
      consent_status: hcp.consentStatus,
    });
  } catch (error) {
    console.error("Error fetching HCP:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

