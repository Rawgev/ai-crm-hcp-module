import { Annotation } from "@langchain/langgraph";

export interface AgentStateType {
  message: string;
  current_draft: Record<string, unknown>;
  intent: "log" | "edit" | "recommend" | "security_reject";
  interaction_patch: Record<string, unknown>;
  compliance_flags: string[];
  recommendations: string[];
  response: string;
  tool_calls: string[];
  thread_id?: string;
  is_safe?: boolean;
  security_violation?: string;
  turn_count?: number;
}

export const AgentStateAnnotation = Annotation.Root({
  message: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),
  current_draft: Annotation<Record<string, unknown>>({
    reducer: (prev, next) => ({ ...(prev || {}), ...(next || {}) }),
    default: () => ({}),
  }),
  intent: Annotation<"log" | "edit" | "recommend" | "security_reject">({
    reducer: (_, next) => next,
    default: () => "log",
  }),
  interaction_patch: Annotation<Record<string, unknown>>({
    reducer: (prev, next) => ({ ...(prev || {}), ...(next || {}) }),
    default: () => ({}),
  }),
  compliance_flags: Annotation<string[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  recommendations: Annotation<string[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  response: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),
  tool_calls: Annotation<string[]>({
    reducer: (prev, next) => [...(prev || []), ...(next || [])],
    default: () => [],
  }),
  thread_id: Annotation<string | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),
  is_safe: Annotation<boolean>({
    reducer: (_, next) => next,
    default: () => true,
  }),
  security_violation: Annotation<string | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),
  turn_count: Annotation<number>({
    reducer: (prev, next) => (next !== undefined ? next : (prev || 0) + 1),
    default: () => 0,
  }),
});
