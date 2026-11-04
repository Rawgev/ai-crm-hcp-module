import { prisma } from "@/lib/prisma";
import { HCPInput } from "../validation/hcp.schema";

export async function listHcps() {
  return await prisma.hCP.findMany({
    orderBy: { fullName: "asc" },
  });
}

export async function getHcpById(id: string) {
  return await prisma.hCP.findUnique({
    where: { id },
    include: {
      interactions: {
        orderBy: { interactionDate: "desc" },
        take: 5,
      },
    },
  });
}

export async function createHcp(data: HCPInput) {
  return await prisma.hCP.create({
    data: {
      id: data.id,
      fullName: data.fullName,
      specialty: data.specialty,
      tier: data.tier,
      organization: data.organization,
      territory: data.territory,
      consentStatus: data.consentStatus,
    },
  });
}

