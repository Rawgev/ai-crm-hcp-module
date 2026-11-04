import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { hcpInteractionAgent } from "@/server/agent/graph";
import { validateAndSanitizePrompt } from "@/server/agent/security";
import { agentRequestSchema } from "@/server/validation/agent.schema";
import { getAppConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

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

    // Prompt Injection Defense Guardrail
    const securityCheck = validateAndSanitizePrompt(validated.message);
    if (!securityCheck.isSafe) {
      return NextResponse.json(
        {
          success: false,
          isSecurityViolation: true,
          message: securityCheck.reason,
          response: securityCheck.reason,
          compliance_flags: ["Adversarial prompt injection attempt intercepted by security guardrail."],
          interaction_patch: {},
          tool_calls: ["security_guardrail_reject"],
        },
        { status: 400 }
      );
    }

    const threadId = validated.thread_id || randomUUID();

    // Timeout guard
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("AI workflow timed out")),
        config.AI_REQUEST_TIMEOUT_SECONDS * 1000
      )
    );

    const agentPromise = hcpInteractionAgent.invoke(
      {
        message: securityCheck.sanitized,
        current_draft: validated.current_draft,
        thread_id: threadId,
      },
      {
        configurable: {
          thread_id: threadId,
        },
      }
    );

    const result = await Promise.race([agentPromise, timeoutPromise]);

    const patch = (result.interaction_patch as Record<string, unknown>) || {};
    if (result.compliance_flags && Array.isArray(result.compliance_flags)) {
      patch.compliance_flags = result.compliance_flags;
    }

    return NextResponse.json({
      success: true,
      message: "ok",
      thread_id: threadId,
      response: result.response || "I processed the interaction.",
      interaction_patch: patch,
      tool_calls: result.tool_calls || [],
    });
  } catch (error) {
    console.error("Agent chat failed:", error);
    return NextResponse.json(aiUnavailableResponse(["agent_chat"]));
  }
}
