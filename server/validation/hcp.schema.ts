import { z } from "zod";

export const hcpSchema = z.object({
  id: z.string().min(1, "HCP ID is required"),
  fullName: z.string().min(1, "Full name is required").max(160),
  specialty: z.string().min(1, "Specialty is required").max(120),
  tier: z.string().default("B"),
  organization: z.string().min(1, "Organization is required").max(180),
  territory: z.string().min(1, "Territory is required").max(120),
  consentStatus: z.string().default("unknown"),
});

export const createHcpSchema = hcpSchema;
export const updateHcpSchema = hcpSchema.partial().omit({ id: true });

export type HCPInput = z.infer<typeof hcpSchema>;

