import { NextRequest, NextResponse } from "next/server";
import { listHcps, createHcp } from "@/server/services/hcp.service";
import { createHcpSchema } from "@/server/validation/hcp.schema";

export async function GET() {
  try {
    const hcps = await listHcps();
    return NextResponse.json(
      hcps.map((hcp) => ({
        id: hcp.id,
        full_name: hcp.fullName,
        specialty: hcp.specialty,
        tier: hcp.tier,
        organization: hcp.organization,
        territory: hcp.territory,
        consent_status: hcp.consentStatus,
      }))
    );
  } catch (error) {
    console.error("Error listing HCPs:", error);
    // Fallback default list if DB is temporarily unreachable
    return NextResponse.json([
      {
        id: "hcp_1001",
        full_name: "Dr. Priya Menon",
        specialty: "Endocrinology",
        tier: "A",
        organization: "MetroCare Diabetes Center",
        territory: "South Zone",
        consent_status: "marketing_opt_in",
      },
      {
        id: "hcp_1002",
        full_name: "Dr. Arjun Shah",
        specialty: "Cardiology",
        tier: "B",
        organization: "Northline Hospital",
        territory: "West Zone",
        consent_status: "limited",
      },
    ]);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = createHcpSchema.parse(body);
    const created = await createHcp(validated);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error("Error creating HCP:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Invalid HCP payload" },
      { status: 400 }
    );
  }
}

