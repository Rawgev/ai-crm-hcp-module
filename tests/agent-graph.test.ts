import { describe, it, expect } from "vitest";
import { hcpInteractionAgent } from "@/server/agent/graph";

describe("LangGraph.js HCP Interaction Workflow", () => {
  it("routes 'log' intent and produces full draft patch with tool trace", async () => {
    const result = await hcpInteractionAgent.invoke({
      message: "Met Dr. Menon, discussed Product X efficacy and safety profile. Positive response, wants Phase III data.",
      current_draft: {},
    });

    expect(result.intent).toBe("log");
    expect(result.interaction_patch).toBeDefined();
    expect(result.interaction_patch.sentiment).toBe("Positive");
    expect(result.interaction_patch.hcp_id).toBe("hcp_1001");
    expect(result.tool_calls).toContain("log_interaction");
    expect(result.tool_calls).toContain("check_compliance");
    expect(result.response).toContain("Review the populated fields before submitting");
  });

  it("routes 'edit' intent and updates fields while maintaining compliance check", async () => {
    const result = await hcpInteractionAgent.invoke({
      message: "Edit the outcome: HCP requested patient starter guide and access details.",
      current_draft: {
        hcp_id: "hcp_1001",
        hcp_name: "Dr. Priya Menon",
        topics_discussed: "Discussed Product X",
        outcomes: "Old outcome",
      },
    });

    expect(result.intent).toBe("edit");
    expect(result.tool_calls).toContain("edit_interaction");
    expect(result.tool_calls).toContain("check_compliance");
    expect(result.response).toContain("updated the interaction draft");
  });

  it("routes 'recommend' intent and creates scheduled proposal", async () => {
    const result = await hcpInteractionAgent.invoke({
      message: "Recommend follow up actions for Dr. Menon",
      current_draft: {
        hcp_name: "Dr. Priya Menon",
        sentiment: "Positive",
      },
    });

    expect(result.intent).toBe("recommend");
    expect(result.tool_calls).toContain("recommend_followups");
    expect(result.tool_calls).toContain("schedule_followup");
    expect(result.response).toContain("Recommended next actions");
  });
});

