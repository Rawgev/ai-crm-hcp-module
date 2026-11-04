import { describe, it, expect } from "vitest";
import { checkCompliance } from "@/server/agent/tools";
import { evaluateCompliance, getComplianceRules } from "@/server/services/compliance.service";

describe("Compliance Rule Engine", () => {
  it("flags off-label discussions correctly", () => {
    const flags = checkCompliance({
      topics_discussed: "Doctor inquired about off-label pediatric use of Product X.",
    });
    expect(flags.some((f) => f.includes("Off-label discussion detected"))).toBe(true);
  });

  it("flags adverse events and side effects", () => {
    const flags = checkCompliance({
      outcomes: "Patient experienced severe side effect and rash.",
    });
    expect(flags.some((f) => f.includes("Potential adverse event mention"))).toBe(true);
  });

  it("flags sample distribution without voice consent", () => {
    const flags = checkCompliance({
      samples_distributed: ["Product X 10 mg starter"],
      consent_for_voice_summary: false,
    });
    expect(flags.some((f) => f.includes("Confirm sample eligibility"))).toBe(true);
  });

  it("allows sample distribution when voice consent is confirmed", () => {
    const flags = checkCompliance({
      samples_distributed: ["Product X 10 mg starter"],
      consent_for_voice_summary: true,
    });
    expect(flags.some((f) => f.includes("Confirm sample eligibility"))).toBe(false);
  });

  it("flags superlative promotional claims", () => {
    const flags = checkCompliance({
      follow_up_actions: "Promised Product X is a cure and best in class.",
    });
    expect(flags.some((f) => f.includes("Promotional claim requires review"))).toBe(true);
  });

  it("returns no flags for clean, compliant discussion", () => {
    const flags = evaluateCompliance({
      topics_discussed: "Discussed Product X efficacy endpoints from Phase III trial.",
      outcomes: "HCP requested approved clinical PDF.",
      follow_up_actions: "Send approved brochure.",
    });
    expect(flags).toHaveLength(0);
  });

  it("provides comprehensive compliance rule definitions", () => {
    const rules = getComplianceRules();
    expect(rules.length).toBeGreaterThanOrEqual(4);
    expect(rules.map((r) => r.category)).toContain("off_label");
    expect(rules.map((r) => r.category)).toContain("adverse_event");
  });
});

