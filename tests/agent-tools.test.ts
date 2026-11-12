import { describe, it, expect } from "vitest";
import {
  fetchHcpProfile,
  searchApprovedMaterials,
  recommendFollowups,
  scheduleFollowup,
  logInteraction,
  editInteraction,
} from "@/server/agent/tools";

describe("AI Agent Tools", () => {
  it("fetches HCP profile with sales context", async () => {
    const profile = await fetchHcpProfile("Dr. Priya Menon");
    expect(profile.hcp_id).toBe("hcp_1001");
    expect(profile.hcp_name).toBe("Dr. Priya Menon");
    expect(profile.specialty).toBe("Endocrinology");
    expect(profile.tier).toBe("A");
    expect(profile.territory).toBe("South Zone");
  });

  it("searches approved materials by topic matching", () => {
    const efficacyMaterials = searchApprovedMaterials("efficacy data");
    expect(efficacyMaterials.some((m) => m.title.includes("efficacy brochure"))).toBe(true);

    const phase3Materials = searchApprovedMaterials("Phase III trial");
    expect(phase3Materials.some((m) => m.title.includes("Phase III"))).toBe(true);
  });

  it("recommends compliant follow-ups based on positive sentiment", () => {
    const actions = recommendFollowups({ sentiment: "Positive" });
    expect(actions.some((a) => a.includes("deeper efficacy discussion"))).toBe(true);
  });

  it("recommends compliant follow-ups based on negative sentiment", () => {
    const actions = recommendFollowups({ sentiment: "Negative" });
    expect(actions.some((a) => a.includes("Log objection themes"))).toBe(true);
  });

  it("schedules follow-up with proper ISO due date in future", () => {
    const followup = scheduleFollowup("Dr. Priya Menon", "Review Phase III PDF", 14);
    expect(followup.hcp_name).toBe("Dr. Priya Menon");
    expect(followup.reason).toBe("Review Phase III PDF");
    expect(followup.status).toBe("proposed");
    expect(followup.due_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("executes logInteraction with local fallback when offline", async () => {
    const patch = await logInteraction("Met Dr. Menon, discussed Product X efficacy. Positive response, wants Phase III data.");
    expect(patch.sentiment).toBe("Positive");
    expect(patch.topics_discussed).toContain("Met Dr. Menon");
    expect(Array.isArray(patch.materials_shared)).toBe(true);
  });

  it("executes editInteraction preserving untouched fields", async () => {
    const draft = {
      hcp_name: "Dr. Priya Menon",
      topics_discussed: "Initial discussion on Product X",
      outcomes: "Initial outcome",
      sentiment: "Neutral",
    };

    const updated = await editInteraction("Update the outcome: HCP requested safety profile data", draft);
    expect(updated.hcp_name).toBe("Dr. Priya Menon");
    expect(updated.outcomes).toContain("safety profile data");
  });

  it("updates HCP name without appending previous or arbitrary surnames", async () => {
    const draft = {
      hcp_name: "Dr. Arjun Shah",
      topics_discussed: "Initial discussion on Product X",
    };
    const updated = await editInteraction("the name is raghav", draft);
    expect(updated.hcp_name).toBe("Dr. Raghav");
    expect(updated.hcp_name).not.toContain("Shah");
  });

  it("extracts full HCP name with surname without truncating or hallucinating", async () => {
    const draft = {
      hcp_name: "Dr. Arjun Shah",
      topics_discussed: "Initial discussion on Product X",
    };
    const updated = await editInteraction("the doctor is Raghav Chauhan", draft);
    expect(updated.hcp_name).toBe("Dr. Raghav Chauhan");
  });
});

