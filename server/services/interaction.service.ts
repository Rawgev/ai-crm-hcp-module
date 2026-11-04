import { prisma } from "@/lib/prisma";
import { checkCompliance } from "../agent/tools";
import { InteractionCreateInput, InteractionUpdateInput } from "../validation/interaction.schema";
import { recordAuditLog, computeDiff } from "./audit.service";
import {
  listFallbackInteractions,
  createFallbackInteraction,
  updateFallbackInteraction,
  getFallbackInteraction,
} from "./fallback-db";

export interface UserContext {
  userId?: string;
  userName?: string;
  userRole?: string;
  ipAddress?: string | null;
}

export function normalizeInteractionPatch(patch: Record<string, unknown>): Record<string, unknown> {
  const aliases: Record<string, string> = {
    outcome: "outcomes",
    follow_up_action: "follow_up_actions",
    followup_actions: "follow_up_actions",
    material_shared: "materials_shared",
    sample_distributed: "samples_distributed",
  };

  const normalized = { ...patch };
  for (const [alias, canonical] of Object.entries(aliases)) {
    if (alias in normalized && !(canonical in normalized)) {
      normalized[canonical] = normalized[alias];
      delete normalized[alias];
    }
  }

  return normalized;
}

export function formatInteraction(record: any) {
  const dateStr = record.interactionDate instanceof Date
    ? record.interactionDate.toISOString().slice(0, 10)
    : String(record.interactionDate);

  return {
    id: typeof record.id === "bigint" ? Number(record.id) : record.id,
    hcp_id: record.hcpId,
    hcp_name: record.hcpName,
    interaction_type: record.interactionType,
    interaction_date: dateStr,
    interaction_time: record.interactionTime,
    attendees: record.attendees,
    topics_discussed: record.topicsDiscussed,
    materials_shared: Array.isArray(record.materialsShared) ? record.materialsShared : [],
    samples_distributed: Array.isArray(record.samplesDistributed) ? record.samplesDistributed : [],
    sentiment: record.sentiment,
    outcomes: record.outcomes,
    follow_up_actions: record.followUpActions,
    ai_summary: record.aiSummary,
    extracted_entities: record.extractedEntities || {},
    compliance_flags: Array.isArray(record.complianceFlags) ? record.complianceFlags : [],
    channel: record.channel,
    consent_for_voice_summary: record.consentForVoiceSummary,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  };
}

export async function listInteractions(hcpId?: string) {
  try {
    const records = await prisma.interaction.findMany({
      where: hcpId ? { hcpId } : undefined,
      orderBy: { interactionDate: "desc" },
      take: 50,
    });

    return records.map(formatInteraction);
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      throw error;
    }
    return listFallbackInteractions(hcpId);
  }
}

export async function getInteractionById(id: number | bigint) {
  try {
    const record = await prisma.interaction.findUnique({
      where: { id: BigInt(id) },
    });

    if (!record) return null;
    return formatInteraction(record);
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      throw error;
    }
    return getFallbackInteraction(Number(id));
  }
}

export async function createInteraction(
  payload: InteractionCreateInput,
  userOrId?: string | UserContext,
  context?: UserContext
) {
  const userCtx: UserContext =
    typeof userOrId === "object" && userOrId !== null
      ? userOrId
      : {
          userId: typeof userOrId === "string" ? userOrId : context?.userId || "user_default_rep",
          userName: context?.userName || "Alex Vance",
          userRole: context?.userRole || "REP",
          ipAddress: context?.ipAddress || null,
        };

  const userId = userCtx.userId || "user_default_rep";
  const userName = userCtx.userName || "Alex Vance";
  const userRole = userCtx.userRole || "REP";
  const ipAddress = userCtx.ipAddress || null;

  const complianceFlags = checkCompliance(payload);
  const dateObj = new Date(payload.interaction_date);

  try {
    const record = await prisma.interaction.create({
      data: {
        hcpId: payload.hcp_id,
        hcpName: payload.hcp_name,
        interactionType: payload.interaction_type,
        interactionDate: dateObj,
        interactionTime: payload.interaction_time,
        attendees: payload.attendees || "",
        topicsDiscussed: payload.topics_discussed || "",
        materialsShared: payload.materials_shared || [],
        samplesDistributed: payload.samples_distributed || [],
        sentiment: payload.sentiment || "Neutral",
        outcomes: payload.outcomes || "",
        followUpActions: payload.follow_up_actions || "",
        aiSummary: payload.ai_summary || payload.topics_discussed || payload.outcomes || "",
        extractedEntities: payload.extracted_entities || {},
        complianceFlags: complianceFlags,
        channel: payload.channel || "field_visit",
        consentForVoiceSummary: payload.consent_for_voice_summary || false,
        createdById: userId !== "user_default_rep" && userId !== "user_system" ? userId : null,
      },
    });

    const formatted = formatInteraction(record);

    // Record immutable audit trail
    await recordAuditLog({
      entityType: "Interaction",
      entityId: String(formatted.id),
      action: "CREATE",
      userId,
      userName,
      userRole,
      changes: { after: formatted },
      ipAddress,
    });

    return formatted;
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      throw error;
    }

    const fallbackRecord = createFallbackInteraction(payload);

    await recordAuditLog({
      entityType: "Interaction",
      entityId: String(fallbackRecord.id),
      action: "CREATE",
      userId,
      userName,
      userRole,
      changes: { after: fallbackRecord },
      ipAddress,
    });

    return fallbackRecord;
  }
}

export async function updateInteraction(
  id: number | bigint,
  payload: InteractionUpdateInput,
  context?: UserContext
) {
  const userId = context?.userId || "user_default_rep";
  const userName = context?.userName || "Alex Vance";
  const userRole = context?.userRole || "REP";
  const ipAddress = context?.ipAddress || null;

  try {
    const existing = await prisma.interaction.findUnique({
      where: { id: BigInt(id) },
    });

    if (!existing) {
      throw new Error("NOT_FOUND");
    }

    const beforeState = formatInteraction(existing);

    const updatedData: Record<string, unknown> = {};

    if (payload.hcp_name !== undefined) updatedData.hcpName = payload.hcp_name;
    if (payload.interaction_type !== undefined) updatedData.interactionType = payload.interaction_type;
    if (payload.interaction_date !== undefined) updatedData.interactionDate = new Date(payload.interaction_date);
    if (payload.interaction_time !== undefined) updatedData.interactionTime = payload.interaction_time;
    if (payload.attendees !== undefined) updatedData.attendees = payload.attendees;
    if (payload.topics_discussed !== undefined) updatedData.topicsDiscussed = payload.topics_discussed;
    if (payload.materials_shared !== undefined) updatedData.materialsShared = payload.materials_shared;
    if (payload.samples_distributed !== undefined) updatedData.samplesDistributed = payload.samples_distributed;
    if (payload.sentiment !== undefined) updatedData.sentiment = payload.sentiment;
    if (payload.outcomes !== undefined) updatedData.outcomes = payload.outcomes;
    if (payload.follow_up_actions !== undefined) updatedData.followUpActions = payload.follow_up_actions;
    if (payload.channel !== undefined) updatedData.channel = payload.channel;
    if (payload.consent_for_voice_summary !== undefined) updatedData.consentForVoiceSummary = payload.consent_for_voice_summary;

    const mergedForCompliance = {
      topics_discussed: payload.topics_discussed ?? existing.topicsDiscussed,
      outcomes: payload.outcomes ?? existing.outcomes,
      follow_up_actions: payload.follow_up_actions ?? existing.followUpActions,
      samples_distributed: payload.samples_distributed ?? existing.samplesDistributed,
      consent_for_voice_summary: payload.consent_for_voice_summary ?? existing.consentForVoiceSummary,
    };

    updatedData.complianceFlags = checkCompliance(mergedForCompliance);

    const record = await prisma.interaction.update({
      where: { id: BigInt(id) },
      data: updatedData,
    });

    const afterState = formatInteraction(record);
    const diff = computeDiff(beforeState, afterState);

    // Record immutable audit trail
    await recordAuditLog({
      entityType: "Interaction",
      entityId: String(id),
      action: "UPDATE",
      userId,
      userName,
      userRole,
      changes: diff,
      ipAddress,
    });

    return afterState;
  } catch (error: any) {
    if (error?.message === "NOT_FOUND") {
      throw error;
    }

    if (process.env.NODE_ENV === "production") {
      throw error;
    }

    const beforeState = getFallbackInteraction(Number(id));
    const fallbackRecord = updateFallbackInteraction(Number(id), payload);
    const diff = computeDiff(beforeState, fallbackRecord);

    await recordAuditLog({
      entityType: "Interaction",
      entityId: String(id),
      action: "UPDATE",
      userId,
      userName,
      userRole,
      changes: diff,
      ipAddress,
    });

    return fallbackRecord;
  }
}

