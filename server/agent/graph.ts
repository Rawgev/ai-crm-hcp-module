import { StateGraph, END, START } from "@langchain/langgraph";
import { AgentStateAnnotation, AgentStateType } from "./state";
import {
  checkCompliance,
  editInteraction,
  fetchHcpProfile,
  logInteraction,
  recommendFollowups,
  scheduleFollowup,
  searchApprovedMaterials,
} from "./tools";

async function detectIntentNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const message = (state.message || "").toLowerCase();
  let intent: "log" | "edit" | "recommend" = "log";

  if (["edit", "change", "update", "modify", "correct"].some((term) => message.includes(term))) {
    intent = "edit";
  } else if (["recommend", "next best", "follow-up", "follow up"].some((term) => message.includes(term))) {
    intent = "recommend";
  }

  return {
    intent,
    tool_calls: [],
  };
}

function routeByIntent(state: AgentStateType): "log" | "edit" | "recommend" {
  return state.intent || "log";
}

async function logNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const draftHcpName = (state.current_draft?.hcp_name as string) || "";
  const profile = await fetchHcpProfile(draftHcpName);
  const patch = await logInteraction(state.message, state.current_draft);

  const topic = `${patch.topics_discussed || ""} ${state.message}`;
  const materials = searchApprovedMaterials(topic);

  const existingMaterials = (patch.materials_shared as string[]) || [];
  if (existingMaterials.length === 0 && materials.length > 0) {
    patch.materials_shared = [materials[0].title];
  }

  patch.hcp_id = patch.hcp_id || profile.hcp_id;
  patch.hcp_name = patch.hcp_name || profile.hcp_name;

  const flags = checkCompliance(patch);
  const actions = recommendFollowups(patch);

  if (!patch.follow_up_actions && actions.length > 0) {
    patch.follow_up_actions = actions[0];
  }

  return {
    interaction_patch: patch,
    compliance_flags: flags,
    recommendations: actions,
    tool_calls: [
      "fetch_hcp_profile",
      "log_interaction",
      "search_approved_materials",
      "check_compliance",
      "recommend_followups",
    ],
  };
}

async function editNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const patch = await editInteraction(state.message, state.current_draft || {});
  const flags = checkCompliance(patch);

  return {
    interaction_patch: patch,
    compliance_flags: flags,
    tool_calls: ["edit_interaction", "check_compliance"],
  };
}

async function recommendNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const draft = state.current_draft || {};
  const actions = recommendFollowups(draft);
  const hcpName = (draft.hcp_name as string) || "Selected HCP";
  const followup = scheduleFollowup(hcpName, actions[0] || "Follow up after HCP discussion", 14);

  return {
    recommendations: actions,
    interaction_patch: {
      ...draft,
      follow_up_actions: actions.join("; "),
    },
    tool_calls: ["recommend_followups", "schedule_followup"],
    response: `Recommended next actions and proposed a follow-up for ${followup.due_date}.`,
  };
}

async function respondNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const patch = state.interaction_patch || {};
  const flags = state.compliance_flags || [];
  const actions = state.recommendations || [];

  let response: string;
  if (state.intent === "edit") {
    response = "I updated the interaction draft and rechecked it for compliance.";
  } else if (state.intent === "recommend") {
    response = state.response || "I recommended compliant next steps for this HCP.";
  } else {
    response = "I drafted the interaction log from your note. Review the populated fields before submitting.";
  }

  if (patch.ai_summary) {
    response += ` Summary: ${patch.ai_summary}`;
  }
  if (actions.length > 0) {
    response += ` Suggested next step: ${actions[0]}`;
  }
  if (flags.length > 0) {
    response += ` Compliance attention: ${flags.join(" ")}`;
  }

  return { response };
}

export function buildAgentGraph() {
  const workflow = new StateGraph(AgentStateAnnotation)
    .addNode("detect_intent", detectIntentNode)
    .addNode("log", logNode)
    .addNode("edit", editNode)
    .addNode("recommend", recommendNode)
    .addNode("respond", respondNode)
    .addEdge(START, "detect_intent")
    .addConditionalEdges("detect_intent", routeByIntent, {
      log: "log",
      edit: "edit",
      recommend: "recommend",
    })
    .addEdge("log", "respond")
    .addEdge("edit", "respond")
    .addEdge("recommend", "respond")
    .addEdge("respond", END);

  return workflow.compile();
}

export const hcpInteractionAgent = buildAgentGraph();

