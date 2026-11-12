import Groq from "groq-sdk";
import { getAppConfig } from "@/lib/config";

const config = getAppConfig();

let groqInstance: Groq | null = null;

export function getGroqClient(): Groq | null {
  if (!config.GROQ_API_KEY) {
    return null;
  }
  if (!groqInstance) {
    groqInstance = new Groq({
      apiKey: config.GROQ_API_KEY,
    });
  }
  return groqInstance;
}

export function extractJsonFromText(text: string): Record<string, unknown> {
  if (!text) return {};
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    return {};
  }
  try {
    return JSON.parse(match[0]) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function fallbackExtract(
  note: string,
  currentDraft?: Record<string, unknown>
): Record<string, unknown> {
  const lowered = (note || "").toLowerCase();
  let sentiment = "Neutral";

  if (["positive", "interested", "agreed", "adopt", "wants"].some((term) => lowered.includes(term))) {
    sentiment = "Positive";
  } else if (["concern", "skeptical", "negative", "barrier", "reject"].some((term) => lowered.includes(term))) {
    sentiment = "Negative";
  }

  let hcpName = (currentDraft?.hcp_name as string) || "";
  let hcpId = (currentDraft?.hcp_id as string) || "";

  if (lowered.includes("arjun") || lowered.includes("shah")) {
    hcpName = "Dr. Arjun Shah";
    hcpId = "hcp_1002";
  } else if (lowered.includes("priya") || lowered.includes("menon")) {
    hcpName = "Dr. Priya Menon";
    hcpId = "hcp_1001";
  } else {
    const drMatch = note.match(/\b(?:Dr\.|Doctor)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)\b/i);
    if (drMatch && drMatch[1]) {
      const raw = drMatch[1].trim();
      const formatted = raw
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
      hcpName = formatted.toLowerCase().startsWith("dr.") || formatted.toLowerCase().startsWith("dr ")
        ? formatted
        : `Dr. ${formatted}`;
      hcpId = "hcp_custom";
    }
  }

  const patch: Record<string, unknown> = {
    topics_discussed: note,
    sentiment,
    outcomes: "HCP discussion captured from conversational note.",
    follow_up_actions: "Send approved follow-up material and schedule next touchpoint.",
    materials_shared: [] as string[],
    samples_distributed: [] as string[],
  };

  if (hcpName) {
    patch.hcp_name = hcpName;
    patch.hcp_id = hcpId || "hcp_1001";
  }

  if (lowered.includes("phase iii") || lowered.includes("phase 3")) {
    patch.materials_shared = ["Product X Phase III data PDF"];
  }

  return currentDraft ? { ...currentDraft, ...patch } : patch;
}

export function fallbackEdit(
  instruction: string,
  currentDraft: Record<string, unknown>
): Record<string, unknown> {
  const patched = { ...currentDraft };
  const lowered = instruction.toLowerCase();

  if (lowered.includes("outcome")) {
    patched.outcomes = instruction;
  } else if (lowered.includes("follow")) {
    patched.follow_up_actions = instruction;
  } else if (lowered.includes("attendee")) {
    patched.attendees = instruction;
  } else if (lowered.includes("topic")) {
    patched.topics_discussed = instruction;
  } else if (lowered.includes("time") || lowered.includes("timing") || lowered.includes("clock")) {
    const timeMatch = instruction.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2] || "00";
      const ampm = timeMatch[3]?.toLowerCase();
      if (ampm === "pm" && hours < 12) hours += 12;
      if (ampm === "am" && hours === 12) hours = 0;
      patched.interaction_time = `${hours.toString().padStart(2, "0")}:${minutes.padStart(2, "0")}`;
    }
  } else if (
    lowered.includes("hcp name") ||
    lowered.includes("doctor name") ||
    lowered.includes("the hcp") ||
    lowered.includes("the doctor") ||
    lowered.includes("was arjun") ||
    lowered.includes("was priya") ||
    lowered.includes("name was") ||
    lowered.includes("name is") ||
    lowered.includes("hcp was") ||
    lowered.includes("hcp is") ||
    lowered.includes("doctor was") ||
    lowered.includes("doctor is") ||
    lowered.includes("arjun") ||
    lowered.includes("shah") ||
    lowered.includes("priya") ||
    lowered.includes("menon")
  ) {
    if (lowered.includes("arjun") || lowered.includes("shah")) {
      patched.hcp_name = "Dr. Arjun Shah";
      patched.hcp_id = "hcp_1002";
    } else if (lowered.includes("priya") || lowered.includes("menon")) {
      patched.hcp_name = "Dr. Priya Menon";
      patched.hcp_id = "hcp_1001";
    } else {
      const match = instruction.match(/(?:name\s+(?:is|was)|doctor\s+(?:is|was)|hcp\s+(?:is|was)|the\s+doctor\s+(?:is|was)|the\s+hcp\s+(?:is|was)|(?:Dr\.|Doctor)\s+)([a-zA-Z\s.]+)/i);
      if (match && match[1]) {
        let rawName = match[1].trim();
        rawName = rawName.replace(/\s+(told|said|mentioned|noted|stated|asked|that|who|was|is)\b[\s\S]*/i, "").trim();
        const formatted = rawName
          .split(/\s+/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(" ");
        const finalName = formatted.toLowerCase().startsWith("dr.") || formatted.toLowerCase().startsWith("dr ")
          ? formatted
          : `Dr. ${formatted}`;
        patched.hcp_name = finalName;
        patched.hcp_id = "hcp_custom";
      }
    }
    if (lowered.includes("told me") || lowered.includes("discussed") || lowered.includes("patient") || lowered.includes("positive")) {
      patched.topics_discussed = instruction;
    }
  } else {
    patched.topics_discussed = instruction;
  }

  patched.ai_summary = "Applied conversational edit to the draft.";
  return patched;
}

export interface FallbackLadderResult {
  content: string;
  modelUsed: string;
  tier: "primary" | "secondary" | "fallback";
  attempts: number;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitOrTransient(error: any): boolean {
  if (!error) return false;
  const status = error?.status || error?.statusCode;
  if (status === 429 || status === 404 || status === 500 || status === 502 || status === 503 || status === 504) {
    return true;
  }
  const msg = String(error?.message || "").toLowerCase();
  return (
    msg.includes("429") ||
    msg.includes("rate limit") ||
    msg.includes("rate_limit_exceeded") ||
    msg.includes("timeout") ||
    msg.includes("econnreset") ||
    msg.includes("fetch failed") ||
    msg.includes("model_not_found") ||
    msg.includes("does not exist")
  );
}

/**
 * Multi-Model Fallback Ladder (Phase 3)
 * Primary: llama-3.1-8b-instant (ultra-fast, low latency)
 * Secondary: llama-3.3-70b-versatile (high-capacity fallback for rate limits or complex JSON)
 * Tertiary: Local deterministic heuristic engine
 */
export async function invokeGroqWithFallbackLadder(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  options?: {
    primaryModel?: string;
    secondaryModel?: string;
    timeoutSeconds?: number;
    maxRetries?: number;
  }
): Promise<FallbackLadderResult> {
  const client = getGroqClient();
  const primaryModel = options?.primaryModel || config.GROQ_MODEL || "openai/gpt-oss-20b";
  const secondaryModel = options?.secondaryModel || config.GROQ_CONTEXT_MODEL || "openai/gpt-oss-120b";
  const timeoutSeconds = options?.timeoutSeconds || config.AI_REQUEST_TIMEOUT_SECONDS || 12;

  if (!client) {
    return {
      content: "",
      modelUsed: "local-fallback",
      tier: "fallback",
      attempts: 0,
    };
  }

  let totalAttempts = 0;

  // 1. Try Primary Model with exponential backoff
  for (let attempt = 1; attempt <= 2; attempt++) {
    totalAttempts++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutSeconds * 1000);

    try {
      const response = await client.chat.completions.create(
        {
          model: primaryModel,
          messages,
          temperature: 0.1,
          max_tokens: 900,
        },
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);
      const text = response.choices[0]?.message?.content || "";
      if (text) {
        return {
          content: text,
          modelUsed: primaryModel,
          tier: "primary",
          attempts: totalAttempts,
        };
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isTransient = isRateLimitOrTransient(err);
      if (attempt === 1 && isTransient) {
        // Backoff with jitter (500ms)
        await sleep(500 + Math.random() * 200);
        continue;
      }
      console.warn(`Primary model ${primaryModel} failed; triggering secondary fallback ladder:`, err?.message || err);
      break;
    }
  }

  // 2. Escalation Tier: Secondary Model (llama-3.3-70b-versatile)
  totalAttempts++;
  const secondaryController = new AbortController();
  const secondaryTimeoutId = setTimeout(() => secondaryController.abort(), timeoutSeconds * 1000);

  try {
    const response = await client.chat.completions.create(
      {
        model: secondaryModel,
        messages,
        temperature: 0.1,
        max_tokens: 1200,
      },
      { signal: secondaryController.signal }
    );

    clearTimeout(secondaryTimeoutId);
    const text = response.choices[0]?.message?.content || "";
    if (text) {
      return {
        content: text,
        modelUsed: secondaryModel,
        tier: "secondary",
        attempts: totalAttempts,
      };
    }
  } catch (err: any) {
    clearTimeout(secondaryTimeoutId);
    console.error(`Secondary model ${secondaryModel} failed; escalating to tertiary heuristics:`, err?.message || err);
  }

  // 3. Tertiary Fallback Tier: Local deterministic heuristics
  return {
    content: "",
    modelUsed: "local-heuristics",
    tier: "fallback",
    attempts: totalAttempts,
  };
}

export async function invokeGroqWithTimeout(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  model: string = config.GROQ_MODEL,
  timeoutSeconds: number = config.AI_REQUEST_TIMEOUT_SECONDS
): Promise<string> {
  const result = await invokeGroqWithFallbackLadder(messages, {
    primaryModel: model,
    timeoutSeconds,
  });

  if (!result.content && result.tier === "fallback") {
    throw new Error("GROQ_API_KEY is not configured or all models failed");
  }

  return result.content;
}
