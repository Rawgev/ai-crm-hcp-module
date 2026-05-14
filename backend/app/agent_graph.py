from typing import Any, Literal, TypedDict

from langgraph.graph import END, StateGraph

from .agent_tools import (
    check_compliance,
    edit_interaction,
    fetch_hcp_profile,
    log_interaction,
    recommend_followups,
    schedule_followup,
    search_approved_materials,
)


class AgentState(TypedDict, total=False):
    message: str
    current_draft: dict[str, Any]
    intent: Literal["log", "edit", "recommend"]
    interaction_patch: dict[str, Any]
    compliance_flags: list[str]
    recommendations: list[str]
    response: str
    tool_calls: list[str]


def _detect_intent(state: AgentState) -> AgentState:
    message = state["message"].lower()
    if any(term in message for term in ["edit", "change", "update", "modify", "correct"]):
        intent = "edit"
    elif any(term in message for term in ["recommend", "next best", "follow-up", "follow up"]):
        intent = "recommend"
    else:
        intent = "log"
    return {**state, "intent": intent, "tool_calls": []}


def _route_by_intent(state: AgentState) -> str:
    return state.get("intent", "log")


def _log_node(state: AgentState) -> AgentState:
    profile = fetch_hcp_profile.invoke({"hcp_name": state.get("current_draft", {}).get("hcp_name", "")})
    patch = log_interaction.invoke({"note": state["message"], "current_draft": state.get("current_draft", {})})
    topic = f"{patch.get('topics_discussed', '')} {state['message']}"
    materials = search_approved_materials.invoke({"topic": topic})
    if not patch.get("materials_shared") and materials:
        patch["materials_shared"] = [materials[0]["title"]]
    patch["hcp_id"] = patch.get("hcp_id") or profile["hcp_id"]
    patch["hcp_name"] = patch.get("hcp_name") or profile["hcp_name"]
    flags = check_compliance.invoke({"interaction": patch})
    actions = recommend_followups.invoke({"interaction": patch})
    if not patch.get("follow_up_actions") and actions:
        patch["follow_up_actions"] = actions[0]
    return {
        **state,
        "interaction_patch": patch,
        "compliance_flags": flags,
        "recommendations": actions,
        "tool_calls": state["tool_calls"] + [
            "fetch_hcp_profile",
            "log_interaction",
            "search_approved_materials",
            "check_compliance",
            "recommend_followups"
        ]
    }


def _edit_node(state: AgentState) -> AgentState:
    patch = edit_interaction.invoke({
        "instruction": state["message"],
        "current_draft": state.get("current_draft", {})
    })
    flags = check_compliance.invoke({"interaction": patch})
    return {
        **state,
        "interaction_patch": patch,
        "compliance_flags": flags,
        "tool_calls": state["tool_calls"] + ["edit_interaction", "check_compliance"]
    }


def _recommend_node(state: AgentState) -> AgentState:
    draft = state.get("current_draft", {})
    actions = recommend_followups.invoke({"interaction": draft})
    followup = schedule_followup.invoke({
        "hcp_name": draft.get("hcp_name", "Selected HCP"),
        "reason": actions[0] if actions else "Follow up after HCP discussion",
        "days_from_now": 14
    })
    return {
        **state,
        "recommendations": actions,
        "interaction_patch": {
            **draft,
            "follow_up_actions": "; ".join(actions)
        },
        "tool_calls": state["tool_calls"] + ["recommend_followups", "schedule_followup"],
        "response": f"Recommended next actions and proposed a follow-up for {followup['due_date']}."
    }


def _respond_node(state: AgentState) -> AgentState:
    patch = state.get("interaction_patch", {})
    flags = state.get("compliance_flags", [])
    actions = state.get("recommendations", [])
    if state.get("intent") == "edit":
        response = "I updated the interaction draft and rechecked it for compliance."
    elif state.get("intent") == "recommend":
        response = state.get("response", "I recommended compliant next steps for this HCP.")
    else:
        response = "I drafted the interaction log from your note. Review the populated fields before submitting."
    if patch.get("ai_summary"):
        response += f" Summary: {patch['ai_summary']}"
    if actions:
        response += f" Suggested next step: {actions[0]}"
    if flags:
        response += f" Compliance attention: {' '.join(flags)}"
    return {**state, "response": response}


def build_agent_graph():
    graph = StateGraph(AgentState)
    graph.add_node("detect_intent", _detect_intent)
    graph.add_node("log", _log_node)
    graph.add_node("edit", _edit_node)
    graph.add_node("recommend", _recommend_node)
    graph.add_node("respond", _respond_node)
    graph.set_entry_point("detect_intent")
    graph.add_conditional_edges(
        "detect_intent",
        _route_by_intent,
        {"log": "log", "edit": "edit", "recommend": "recommend"}
    )
    graph.add_edge("log", "respond")
    graph.add_edge("edit", "respond")
    graph.add_edge("recommend", "respond")
    graph.add_edge("respond", END)
    return graph.compile()


hcp_interaction_agent = build_agent_graph()
