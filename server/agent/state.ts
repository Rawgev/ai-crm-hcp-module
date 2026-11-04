import { Annotation } from "@langchain/langgraph";

export interface AgentStateType {
  message: string;
  current_draft: Record<string, unknown>;
  intent: "log" | "edit" | "recommend";
  interaction_patch: Record<string, unknown>;
  compliance_flags: string[];
  recommendations: string[];
  response: string;
  tool_calls: string[];
}

export const AgentStateAnnotation = Annotation.Root({
  message: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),
  current_draft: Annotation<Record<string, unknown>>({
    reducer: (_, next) => next,
    default: () => ({}),
  }),
  intent: Annotation<"log" | "edit" | "recommend">({
    reducer: (_, next) => next,
    default: () => "log",
  }),
  interaction_patch: Annotation<Record<string, unknown>>({
    reducer: (_, next) => next,
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
});

