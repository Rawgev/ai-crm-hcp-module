import { NextRequest, NextResponse } from "next/server";
import { hcpInteractionAgent } from "@/server/agent/graph";
import { agentRequestSchema } from "@/server/validation/agent.schema";
import { getAppConfig } from "@/lib/config";

const config = getAppConfig();

function aiUnavailableResponse(toolCalls: string[] = ["agent_chat"]) {
  return {
    success: false,
    message: "AI service temporarily unavailable",
    response: "AI service is temporarily unavailable. You can still complete and save the structured CRM log manually.",
    interaction_patch: {},
    tool_calls: toolCalls,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = agentRequestSchema.parse(body);

    // Timeout guard
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("AI workflow timed out")),
        config.AI_REQUEST_TIMEOUT_SECONDS * 1000
      )
    );

    const agentPromise = hcpInteractionAgent.invoke({
      message: validated.message,
      current_draft: validated.current_draft,
    });

    const result = await Promise.race([agentPromise, timeoutPromise]);

    const patch = (result.interaction_patch as Record<string, unknown>) || {};
    if (result.compliance_flags && Array.isArray(result.compliance_flags)) {
      patch.compliance_flags = result.compliance_flags;
    }

    return NextResponse.json({
      success: true,
      message: "ok",
      response: result.response || "I processed the interaction.",
      interaction_patch: patch,
      tool_calls: result.tool_calls || [],
    });
  } catch (error) {
    console.error("Agent chat failed:", error);
    return NextResponse.json(aiUnavailableResponse(["agent_chat"]));
  }
}

