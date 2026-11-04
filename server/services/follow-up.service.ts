import { prisma } from "@/lib/prisma";
import { recommendFollowups, scheduleFollowup } from "../agent/tools";

export interface CreateFollowUpInput {
  interactionId?: bigint | number;
  hcpId: string;
  hcpName: string;
  reason: string;
  dueDate: string;
  status?: string;
}

export async function listFollowUps(hcpId?: string) {
  return await prisma.followUp.findMany({
    where: hcpId ? { hcpId } : undefined,
    orderBy: { dueDate: "asc" },
  });
}

export async function createFollowUp(input: CreateFollowUpInput) {
  return await prisma.followUp.create({
    data: {
      interactionId: input.interactionId ? BigInt(input.interactionId) : null,
      hcpId: input.hcpId,
      hcpName: input.hcpName,
      reason: input.reason,
      dueDate: new Date(input.dueDate),
      status: input.status || "proposed",
    },
  });
}

export function recommendActions(interaction: Record<string, unknown>) {
  const actions = recommendFollowups(interaction);
  const hcpName = (interaction.hcp_name as string) || "Selected HCP";
  const proposal = scheduleFollowup(hcpName, actions[0] || "Follow up after HCP discussion", 14);

  return {
    actions,
    proposal,
  };
}

