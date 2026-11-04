import { describe, it, expect } from "vitest";
import { interactionCreateSchema, interactionUpdateSchema } from "@/server/validation/interaction.schema";
import { agentRequestSchema, agentToolRequestSchema } from "@/server/validation/agent.schema";
import { createHcpSchema } from "@/server/validation/hcp.schema";
import { registerSchema, loginSchema } from "@/server/validation/auth.schema";

describe("Zod Validation Schemas", () => {
  it("validates valid interaction payload", () => {
    const valid = {
      hcp_id: "hcp_1001",
      hcp_name: "Dr. Priya Menon",
      interaction_type: "Meeting",
      interaction_date: "2026-11-03",
      interaction_time: "14:30",
      topics_discussed: "Discussed Product X",
      sentiment: "Positive",
    };
    const parsed = interactionCreateSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it("fails interaction payload with missing required fields", () => {
    const invalid = {
      interaction_type: "Meeting",
    };
    const parsed = interactionCreateSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it("validates interaction partial update", () => {
    const update = {
      outcomes: "Agreed to follow-up in 2 weeks",
      sentiment: "Neutral",
    };
    const parsed = interactionUpdateSchema.safeParse(update);
    expect(parsed.success).toBe(true);
  });

  it("validates agent chat request", () => {
    const req = {
      message: "Met Dr. Menon, discussed Product X.",
      current_draft: { hcp_name: "Dr. Priya Menon" },
    };
    const parsed = agentRequestSchema.safeParse(req);
    expect(parsed.success).toBe(true);
  });

  it("validates agent tool request with supported tools", () => {
    const tools = [
      "log_interaction",
      "edit_interaction",
      "fetch_hcp_profile",
      "search_approved_materials",
      "recommend_followups",
    ];

    for (const tool of tools) {
      const parsed = agentToolRequestSchema.safeParse({
        tool_name: tool,
        message: "test",
        current_draft: {},
      });
      expect(parsed.success).toBe(true);
    }
  });

  it("validates HCP creation schema", () => {
    const hcp = {
      id: "hcp_9999",
      fullName: "Dr. Jane Doe",
      specialty: "Oncology",
      organization: "General Hospital",
      territory: "North Zone",
    };
    const parsed = createHcpSchema.safeParse(hcp);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.tier).toBe("B");
      expect(parsed.data.consentStatus).toBe("unknown");
    }
  });

  it("validates user registration and login schemas", () => {
    const reg = {
      email: "rep@crm.example.com",
      password: "secretPassword123",
      name: "Field Rep",
    };
    expect(registerSchema.safeParse(reg).success).toBe(true);

    const login = {
      email: "rep@crm.example.com",
      password: "secretPassword123",
    };
    expect(loginSchema.safeParse(login).success).toBe(true);
  });
});

