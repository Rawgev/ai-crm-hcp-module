import { describe, it, expect } from "vitest";
import { GET as getHealth } from "@/app/api/health/route";
import { POST as postAgentChat } from "@/app/api/agent/chat/route";
import { POST as postAgentTool } from "@/app/api/agent/tool/route";
import { GET as getComplianceRules } from "@/app/api/compliance/rules/route";
import { POST as checkComplianceRoute } from "@/app/api/compliance/check/route";
import { NextRequest } from "next/server";

describe("API Route Handlers", () => {
  it("GET /api/health returns 200 and ok status", async () => {
    const res = await getHealth();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("ok");
    expect(data.service).toBe("ai-crm-api");
    expect(data.runtime).toBe("nextjs-fullstack");
  });

  it("GET /api/compliance/rules returns compliance rule catalog", async () => {
    const res = await getComplianceRules();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.rules).toBeInstanceOf(Array);
    expect(data.rules.length).toBeGreaterThan(0);
  });

  it("POST /api/compliance/check evaluates flags", async () => {
    const req = new NextRequest("http://localhost:3000/api/compliance/check", {
      method: "POST",
      body: JSON.stringify({
        interaction: {
          topics_discussed: "Discussed off-label usage.",
        },
      }),
    });

    const res = await checkComplianceRoute(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.compliant).toBe(false);
    expect(data.compliance_flags.length).toBeGreaterThan(0);
  });

  it("POST /api/agent/tool executes log_interaction tool", async () => {
    const req = new NextRequest("http://localhost:3000/api/agent/tool", {
      method: "POST",
      body: JSON.stringify({
        tool_name: "log_interaction",
        message: "Met Dr. Menon, discussed Product X efficacy.",
        current_draft: {},
      }),
    });

    const res = await postAgentTool(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.tool_calls).toContain("log_interaction");
    expect(data.interaction_patch).toBeDefined();
  });

  it("POST /api/agent/chat runs conversational LangGraph agent", async () => {
    const req = new NextRequest("http://localhost:3000/api/agent/chat", {
      method: "POST",
      body: JSON.stringify({
        message: "Met Dr. Menon, discussed Product X efficacy and safety profile. Positive response, wants Phase III data.",
        current_draft: {},
      }),
    });

    const res = await postAgentChat(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.interaction_patch.sentiment).toBe("Positive");
    expect(data.tool_calls).toContain("log_interaction");
  });
});

