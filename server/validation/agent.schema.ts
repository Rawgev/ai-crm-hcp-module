import { z } from "zod";

export const agentRequestSchema = z.object({
  message: z.string().default(""),
  current_draft: z.record(z.any()).default({}),
  thread_id: z.string().optional(),
});

export const agentToolRequestSchema = agentRequestSchema.extend({
  tool_name: z.enum([
    "log_interaction",
    "edit_interaction",
    "fetch_hcp_profile",
    "search_approved_materials",
    "recommend_followups",
  ]),
});

export const agentResponseSchema = z.object({
  success: z.boolean().default(true),
  message: z.string().default(""),
  response: z.string(),
  interaction_patch: z.record(z.any()).default({}),
  tool_calls: z.array(z.string()).default([]),
});

export type AgentRequestInput = z.infer<typeof agentRequestSchema>;
export type AgentToolRequestInput = z.infer<typeof agentToolRequestSchema>;
export type AgentResponseOutput = z.infer<typeof agentResponseSchema>;

