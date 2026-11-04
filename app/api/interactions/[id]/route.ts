import { NextRequest, NextResponse } from "next/server";
import { getInteractionById, updateInteraction } from "@/server/services/interaction.service";
import { interactionUpdateSchema } from "@/server/validation/interaction.schema";

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

    const updated = await updateInteraction(id, validated);
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

