import { NextRequest, NextResponse } from "next/server";
import { createInteraction, listInteractions } from "@/server/services/interaction.service";
import { interactionCreateSchema } from "@/server/validation/interaction.schema";
import { getSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const hcpId = searchParams.get("hcp_id") || undefined;
    const interactions = await listInteractions(hcpId);
    return NextResponse.json(interactions);
  } catch (error) {
    console.error("Error listing interactions:", error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = interactionCreateSchema.parse(body);

    const session = await getSession(req);
    const userId = session.user?.id;

    const interaction = await createInteraction(validated, userId);
    return NextResponse.json(interaction, { status: 201 });
  } catch (error: any) {
    console.error("Error creating interaction:", error);
    const message = error.errors?.[0]?.message || error.message || "Could not save interaction";
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}

