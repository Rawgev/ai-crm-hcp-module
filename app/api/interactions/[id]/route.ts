import { NextRequest, NextResponse } from "next/server";
import { getInteractionById, updateInteraction } from "@/server/services/interaction.service";
import { interactionUpdateSchema } from "@/server/validation/interaction.schema";
import { getSession } from "@/lib/auth/session";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ message: "Invalid ID" }, { status: 400 });
    }

    const interaction = await getInteractionById(id);
    if (!interaction) {
      return NextResponse.json({ message: "Interaction not found" }, { status: 404 });
    }

    return NextResponse.json(interaction);
  } catch (error) {
    console.error("Error getting interaction:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ message: "Invalid ID" }, { status: 400 });
    }

    const body = await req.json();
    const validated = interactionUpdateSchema.parse(body);

    const session = await getSession(req);
    const userContext = {
      userId: session.user?.id || "user_default_rep",
      userName: session.user?.name || "Alex Vance",
      userRole: session.user?.role || "REP",
      ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1",
    };

    const updated = await updateInteraction(id, validated, userContext);
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating interaction:", error);
    if (error.message === "NOT_FOUND") {
      return NextResponse.json({ message: "Interaction not found" }, { status: 404 });
    }
    const message = error.errors?.[0]?.message || error.message || "Could not update interaction";
    return NextResponse.json({ message }, { status: 400 });
  }
}

