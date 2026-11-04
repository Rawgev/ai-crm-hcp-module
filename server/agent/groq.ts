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

  const patch: Record<string, unknown> = {
    topics_discussed: note,
    sentiment,
    outcomes: "HCP discussion captured from conversational note.",
    follow_up_actions: "Send approved follow-up material and schedule next touchpoint.",
    materials_shared: [] as string[],
    samples_distributed: [] as string[],
  };

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
  } else {
    patched.topics_discussed = instruction;
  }

  patched.ai_summary = "AI service temporarily unavailable; applied a conservative local edit.";
  return patched;
}

export async function invokeGroqWithTimeout(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  model: string = config.GROQ_MODEL,
  timeoutSeconds: number = config.AI_REQUEST_TIMEOUT_SECONDS
): Promise<string> {
  const client = getGroqClient();
  if (!client) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  const controller = new AbortController();
  const timeoutMs = timeoutSeconds * 1000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await client.chat.completions.create(
      {
        model,
        messages,
        temperature: 0.1,
        max_tokens: 900,
      },
      { signal: controller.signal }
    );

    return response.choices[0]?.message?.content || "";
  } finally {
    clearTimeout(timeoutId);
  }
}

