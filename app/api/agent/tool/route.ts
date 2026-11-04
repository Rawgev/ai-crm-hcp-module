import { NextRequest, NextResponse } from "next/server";
import {
  checkCompliance,
  editInteraction,
  fetchHcpProfile,
  logInteraction,
  recommendFollowups,
  searchApprovedMaterials,
} from "@/server/agent/tools";
import { validateAndSanitizePrompt } from "@/server/agent/security";
import { normalizeInteractionPatch } from "@/server/services/interaction.service";
import { agentToolRequestSchema } from "@/server/validation/agent.schema";
import { getAppConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

const config = getAppConfig();

function aiUnavailableResponse(toolName: string) {
  return {
    success: false,
    message: "AI service temporarily unavailable",
    response: "AI service is temporarily unavailable. You can still complete and save the structured CRM log manually.",
    interaction_patch: {},
    tool_calls: [toolName],
  };
}

async function withTimeout<T>(promise: Promise<T>, timeoutSeconds: number): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Tool execution timed out")), timeoutSeconds * 1000)
  );
  return Promise.race([promise, timeoutPromise]);
}

export async function POST(req: NextRequest) {
  let requestedTool = "unknown";
  try {
    const body = await req.json();
    const payload = agentToolRequestSchema.parse(body);
    requestedTool = payload.tool_name;

    const draft = payload.current_draft || {};
    const message = (payload.message || "").trim();

    // Prompt Injection Defense Guardrail
    if (message) {
      const securityCheck = validateAndSanitizePrompt(message);
      if (!securityCheck.isSafe) {
        return NextResponse.json(
          {
            success: false,
            isSecurityViolation: true,
            message: securityCheck.reason,
            response: securityCheck.reason,
            interaction_patch: {},
            tool_calls: [requestedTool, "security_guardrail_reject"],
          },
          { status: 400 }
        );
      }
    }

    if (payload.tool_name === "log_interaction") {
      const note =
        message ||
        (draft.topics_discussed as string) ||
        (draft.outcomes as string) ||
        "Draft the current HCP interaction.";

      const rawPatch = await withTimeout(
        logInteraction(note, draft),
        config.AI_REQUEST_TIMEOUT_SECONDS
      );
      const patch = normalizeInteractionPatch(rawPatch);
      const flags = checkCompliance({ ...draft, ...patch });
      if (flags.length > 0) {
        patch.compliance_flags = flags;
      }

      return NextResponse.json({
        success: true,
        message: "ok",
        response: "I used Log Interaction to turn the note into structured CRM fields.",
        interaction_patch: patch,
        tool_calls: ["log_interaction", "check_compliance"],
      });
    }

    if (payload.tool_name === "edit_interaction") {
      if (!message) {
        return NextResponse.json({
          success: true,
          message: "ok",
          response: "Type what you want changed, then run Edit Interaction again.",
          interaction_patch: {},
          tool_calls: ["edit_interaction"],
        });
      }

      const rawPatch = await withTimeout(
        editInteraction(message, draft),
        config.AI_REQUEST_TIMEOUT_SECONDS
      );
      const patch = normalizeInteractionPatch(rawPatch);
      const flags = checkCompliance(patch);
      if (flags.length > 0) {
        patch.compliance_flags = flags;
      }

      return NextResponse.json({
        success: true,
        message: "ok",
        response: "I used Edit Interaction to update the current draft and recheck compliance.",
        interaction_patch: patch,
        tool_calls: ["edit_interaction", "check_compliance"],
      });
    }

    if (payload.tool_name === "fetch_hcp_profile") {
      const hcpName = (draft.hcp_name as string) || message;
      const profile = await fetchHcpProfile(hcpName);

      return NextResponse.json({
        success: true,
        message: "ok",
        response: `${profile.hcp_name} is a tier ${profile.tier} ${profile.specialty} HCP at ${profile.organization} in ${profile.territory}. Consent status: ${profile.consent_status}.`,
        interaction_patch: {
          hcp_id: profile.hcp_id,
          hcp_name: profile.hcp_name,
        },
        tool_calls: ["fetch_hcp_profile"],
      });
    }

    if (payload.tool_name === "search_approved_materials") {
      const topic = message || (draft.topics_discussed as string) || (draft.outcomes as string) || "Product X";
      const materials = searchApprovedMaterials(topic);
      const titles = materials.map((item) => item.title);

      return NextResponse.json({
        success: true,
        message: "ok",
        response: `I found approved materials for this discussion: ${titles.join(", ")}.`,
        interaction_patch: { materials_shared: titles },
        tool_calls: ["search_approved_materials"],
      });
    }

    // recommend_followups
    const actions = recommendFollowups(draft);
    return NextResponse.json({
      success: true,
      message: "ok",
      response: `I recommended compliant next steps: ${actions.join("; ")}`,
      interaction_patch: { follow_up_actions: actions.join("; ") },
      tool_calls: ["recommend_followups"],
    });
  } catch (error) {
    console.error("Agent tool error:", error);
    return NextResponse.json(aiUnavailableResponse(requestedTool));
  }
}

