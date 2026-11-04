import { z } from "zod";

export const sentimentEnum = z.enum(["Positive", "Neutral", "Negative"]);

export const interactionCreateSchema = z.object({
  hcp_id: z.string().default("hcp_1001"),
  hcp_name: z.string().min(1, "HCP Name is required"),
  interaction_type: z.string().min(1, "Interaction Type is required"),
  interaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  interaction_time: z.string().min(1, "Interaction Time is required"),
  attendees: z.string().default(""),
  topics_discussed: z.string().default(""),
  materials_shared: z.array(z.string()).default([]),
  samples_distributed: z.array(z.string()).default([]),
  sentiment: sentimentEnum.default("Neutral"),
  outcomes: z.string().default(""),
  follow_up_actions: z.string().default(""),
  channel: z.string().default("field_visit"),
  consent_for_voice_summary: z.boolean().default(false),
  ai_summary: z.string().optional().default(""),
  extracted_entities: z.record(z.any()).optional().default({}),
  compliance_flags: z.array(z.string()).optional().default([]),
});

export const interactionUpdateSchema = interactionCreateSchema.partial();

export type InteractionCreateInput = z.infer<typeof interactionCreateSchema>;
export type InteractionUpdateInput = z.infer<typeof interactionUpdateSchema>;

