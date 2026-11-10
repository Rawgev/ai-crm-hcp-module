import { APPROVED_MATERIALS_CATALOG, ApprovedMaterial } from "./catalog";
import {
  extractJsonFromText,
  fallbackEdit,
  fallbackExtract,
  getGroqClient,
  invokeGroqWithFallbackLadder,
  invokeGroqWithTimeout,
} from "./groq";

export interface HCPProfileResult {
  hcp_id: string;
  hcp_name: string;
  specialty: string;
  tier: string;
  organization: string;
  territory: string;
  consent_status: string;
  last_interaction: string;
}

export interface FollowUpScheduleResult {
  hcp_name: string;
  reason: string;
  due_date: string;
  status: string;
}

/**
 * Fetch territory, specialty, consent, tier, and engagement context for an HCP.
 */
export async function fetchHcpProfile(hcpName?: string): Promise<HCPProfileResult> {
  const lowered = (hcpName || "").toLowerCase();
  if (lowered.includes("arjun") || lowered.includes("shah") || lowered.includes("1002")) {
    return {
      hcp_id: "hcp_1002",
      hcp_name: "Dr. Arjun Shah",
      specialty: "Cardiology",
      tier: "B",
      organization: "Northline Hospital",
      territory: "West Zone",
      consent_status: "limited",
      last_interaction: "Cardiology department outreach on Product X safety",
    };
  }

  return {
    hcp_id: "hcp_1001",
    hcp_name: hcpName || "Dr. Priya Menon",
    specialty: "Endocrinology",
    tier: "A",
    organization: "MetroCare Diabetes Center",
    territory: "South Zone",
    consent_status: "marketing_opt_in",
    last_interaction: "Virtual detail on Product X tolerability",
  };
}

/**
 * Check an HCP interaction for sample, consent, adverse event, and off-label compliance risks.
 */
export function checkCompliance(interaction: Record<string, unknown>): string[] {
  const flags: string[] = [];
  const text = [
    interaction.topics_discussed || "",
    interaction.outcomes || "",
    interaction.follow_up_actions || "",
  ]
    .join(" ")
    .toLowerCase();

  if (text.includes("off-label") || text.includes("off label")) {
    flags.push("Off-label discussion detected; route to Medical Affairs and remove promotional follow-up.");
  }

  if (text.includes("adverse event") || text.includes("side effect")) {
    flags.push("Potential adverse event mention; trigger pharmacovigilance intake workflow.");
  }

  const samples = interaction.samples_distributed;
  const hasSamples = Array.isArray(samples) ? samples.length > 0 : Boolean(samples);
  const voiceConsent = Boolean(interaction.consent_for_voice_summary);

  if (hasSamples && !voiceConsent) {
    flags.push("Confirm sample eligibility and capture required acknowledgement before submission.");
  }

  if (["guarantee", "cure", "best in class"].some((term) => text.includes(term))) {
    flags.push("Promotional claim requires review against approved label language.");
  }

  return flags;
}

/**
 * Find approved sales materials and samples relevant to the HCP conversation topic.
 */
export function searchApprovedMaterials(topic: string): ApprovedMaterial[] {
  const topicLower = (topic || "").toLowerCase();
  const matched = APPROVED_MATERIALS_CATALOG.filter(
    (item) => topicLower.includes(item.topic.toLowerCase()) || item.title.toLowerCase().includes(topicLower)
  );

  return matched.length > 0 ? matched : APPROVED_MATERIALS_CATALOG.slice(0, 2);
}

/**
 * Recommend next best sales actions based on sentiment, content, and compliance state.
 */
export function recommendFollowups(interaction: Record<string, unknown>): string[] {
  const sentiment = (interaction.sentiment as string) || "Neutral";
  const actions: string[] = ["Send only approved materials referenced during the call."];

  if (sentiment === "Positive") {
    actions.push(
      "Schedule a deeper efficacy discussion in 14 days.",
      "Invite HCP to the next compliant peer education session."
    );
  } else if (sentiment === "Negative") {
    actions.push(
      "Log objection themes for coaching.",
      "Ask Medical Affairs to respond to clinical evidence questions."
    );
  } else {
    actions.push(
      "Send concise Phase III summary.",
      "Book a follow-up after HCP reviews the material."
    );
  }

  return actions;
}

/**
 * Create a proposed follow-up task for the field representative.
 */
export function scheduleFollowup(
  hcpName: string = "Selected HCP",
  reason: string = "Follow up after HCP discussion",
  daysFromNow: number = 14
): FollowUpScheduleResult {
  const dateObj = new Date();
  dateObj.setDate(dateObj.getDate() + daysFromNow);
  const dueDate = dateObj.toISOString().slice(0, 10);

  return {
    hcp_name: hcpName,
    reason,
    due_date: dueDate,
    status: "proposed",
  };
}

/**
 * Capture interaction data from free text using an LLM for summary, entity extraction, and field mapping.
 */
export async function logInteraction(
  note: string,
  currentDraft?: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const client = getGroqClient();
  if (!client) {
    console.warn("GROQ_API_KEY missing; executing local fallback for logInteraction.");
    const patch = fallbackExtract(note, currentDraft);
    patch.ai_summary = "Drafted locally because GROQ_API_KEY is not configured.";
    patch.extracted_entities = {
      source: "fallback",
      hcp_mentions: [],
      products: note.toLowerCase().includes("product x") ? ["Product X"] : [],
    };
    return patch;
  }

  try {
    const ladderResult = await invokeGroqWithFallbackLadder([
      {
        role: "system",
        content:
          "You are a life sciences CRM assistant. Extract a compliant interaction draft as strict JSON. " +
          "Fields: hcp_id, hcp_name, interaction_type, interaction_date (YYYY-MM-DD), interaction_time (HH:MM 24-hr format, e.g. '11:00' for 11 am), attendees, topics_discussed, materials_shared, " +
          "samples_distributed, sentiment, outcomes, follow_up_actions, ai_summary, extracted_entities. " +
          "Use only Positive, Neutral, or Negative for sentiment. Do not invent sample distribution.",
      },
      {
        role: "user",
        content: `Current draft: ${JSON.stringify(currentDraft || {})}\nConversation note: ${note}`,
      },
    ]);

    const patch = extractJsonFromText(ladderResult.content);
    if (patch && Object.keys(patch).length > 0) {
      if (ladderResult.tier === "secondary") {
        patch.ai_summary = `${patch.ai_summary || "HCP discussion processed"} (via secondary model)`;
      }
      return patch;
    }
    return fallbackExtract(note, currentDraft);
  } catch (error) {
    console.error("AI extraction failed; returning local fallback patch:", error);
    const patch = fallbackExtract(note, currentDraft);
    patch.ai_summary = "AI service temporarily unavailable; drafted locally from the note.";
    patch.extracted_entities = {
      source: "fallback",
      hcp_mentions: [],
      products: note.toLowerCase().includes("product x") ? ["Product X"] : [],
    };
    return patch;
  }
}

/**
 * Modify previously logged interaction data while preserving untouched fields.
 */
export async function editInteraction(
  instruction: string,
  currentDraft: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const client = getGroqClient();
  if (!client) {
    console.warn("GROQ_API_KEY missing; executing local fallback for editInteraction.");
    return fallbackEdit(instruction, currentDraft);
  }

  try {
    const ladderResult = await invokeGroqWithFallbackLadder([
      {
        role: "system",
        content:
          "You edit an HCP interaction draft. Return the full updated draft as strict JSON, preserving fields " +
          "not mentioned in the instruction. " +
          "If the instruction specifies or changes the HCP or physician name (e.g. 'the name is Raghav' or 'the doctor is Dr. Priya'), " +
          "update hcp_name to the exact name requested (e.g. 'Dr. Raghav' or 'Dr. Priya') formatted with 'Dr.' prefix. " +
          "CRITICAL: Never retain, blend, or append previous surnames. If the user specifies 'raghav', the name is strictly 'Dr. Raghav', NOT 'Dr. Raghav Shah'. " +
          "Only use the surname 'Shah' if the user explicitly writes 'Shah' or 'Arjun'. " +
          "If the instruction specifies or edits the time (e.g. 'timing was 11 am' or 'the timing was 11:00'), set interaction_time to '11:00' (HH:MM 24-hr format). " +
          "Do not overwrite topics_discussed unless the instruction explicitly directs to change the topics. " +
          "Keep promotional language compliant and factual.",
      },
      {
        role: "user",
        content: `Draft: ${JSON.stringify(currentDraft)}\nEdit instruction: ${instruction}`,
      },
    ]);

    const updated = extractJsonFromText(ladderResult.content);
    if (updated && Object.keys(updated).length > 0) {
      // Guardrail: if instruction did not mention 'shah', ensure 'Shah' wasn't accidentally retained or appended
      const instLower = instruction.toLowerCase();
      if (!instLower.includes("shah") && typeof updated.hcp_name === "string") {
        const nameVal = updated.hcp_name as string;
        if (/\bshah\b/i.test(nameVal)) {
          updated.hcp_name = nameVal.replace(/\s+shah\b/gi, "").trim();
        }
      }
      return updated;
    }
    return currentDraft;
  } catch (error) {
    console.error("AI edit failed; returning conservative fallback patch:", error);
    return fallbackEdit(instruction, currentDraft);
  }
}

