import json
import logging
import re
from concurrent.futures import ThreadPoolExecutor, TimeoutError
from datetime import date, timedelta
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.tools import tool
from langchain_groq import ChatGroq

from .config import get_settings


settings = get_settings()
logger = logging.getLogger("ai_crm.agent")


def _get_llm(model: str | None = None) -> ChatGroq | None:
    if not settings.groq_api_key:
        return None
    return ChatGroq(
        api_key=settings.groq_api_key,
        model=model or settings.groq_model,
        temperature=0.1,
        max_tokens=900,
        request_timeout=settings.ai_request_timeout_seconds
    )


def _invoke_llm_with_timeout(llm: ChatGroq, messages: list[SystemMessage | HumanMessage], operation: str):
    logger.info("before Groq call operation=%s model=%s timeout_seconds=%s", operation, settings.groq_model, settings.ai_request_timeout_seconds)
    executor = ThreadPoolExecutor(max_workers=1)
    future = executor.submit(llm.invoke, messages)
    try:
        response = future.result(timeout=settings.ai_request_timeout_seconds)
        logger.info("after Groq call operation=%s", operation)
        return response
    except TimeoutError:
        future.cancel()
        logger.exception("Groq call timed out operation=%s timeout_seconds=%s", operation, settings.ai_request_timeout_seconds)
        raise
    except Exception:
        logger.exception("Groq call failed operation=%s", operation)
        raise
    finally:
        executor.shutdown(wait=False, cancel_futures=True)


def _json_from_text(text: str) -> dict[str, Any]:
    match = re.search(r"\{.*\}", text, flags=re.DOTALL)
    if not match:
        return {}
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        return {}


def _fallback_extract(note: str, current_draft: dict[str, Any] | None = None) -> dict[str, Any]:
    lowered = note.lower()
    sentiment = "Neutral"
    if any(term in lowered for term in ["positive", "interested", "agreed", "adopt", "wants"]):
        sentiment = "Positive"
    if any(term in lowered for term in ["concern", "skeptical", "negative", "barrier", "reject"]):
        sentiment = "Negative"

    patch = {
        "topics_discussed": note,
        "sentiment": sentiment,
        "outcomes": "HCP discussion captured from conversational note.",
        "follow_up_actions": "Send approved follow-up material and schedule next touchpoint.",
        "materials_shared": [],
        "samples_distributed": []
    }
    if "phase iii" in lowered or "phase 3" in lowered:
        patch["materials_shared"] = ["Product X Phase III data PDF"]
    if current_draft:
        patch = {**current_draft, **patch}
    return patch


@tool
def fetch_hcp_profile(hcp_name: str) -> dict[str, Any]:
    """Fetch territory, specialty, consent, tier, and engagement context for an HCP."""
    return {
        "hcp_id": "hcp_1001",
        "hcp_name": hcp_name or "Dr. Priya Menon",
        "specialty": "Endocrinology",
        "tier": "A",
        "organization": "MetroCare Diabetes Center",
        "territory": "South Zone",
        "consent_status": "marketing_opt_in",
        "last_interaction": "Virtual detail on Product X tolerability"
    }


@tool
def check_compliance(interaction: dict[str, Any]) -> list[str]:
    """Check an HCP interaction for sample, consent, adverse event, and off-label compliance risks."""
    flags: list[str] = []
    text = " ".join(str(interaction.get(field, "")) for field in ["topics_discussed", "outcomes", "follow_up_actions"]).lower()
    if "off-label" in text or "off label" in text:
        flags.append("Off-label discussion detected; route to Medical Affairs and remove promotional follow-up.")
    if "adverse event" in text or "side effect" in text:
        flags.append("Potential adverse event mention; trigger pharmacovigilance intake workflow.")
    if interaction.get("samples_distributed") and interaction.get("consent_for_voice_summary") is False:
        flags.append("Confirm sample eligibility and capture required acknowledgement before submission.")
    if any(term in text for term in ["guarantee", "cure", "best in class"]):
        flags.append("Promotional claim requires review against approved label language.")
    return flags


@tool
def search_approved_materials(topic: str) -> list[dict[str, str]]:
    """Find approved sales materials and samples relevant to the HCP conversation topic."""
    catalog = [
        {"id": "mat_101", "title": "Product X efficacy brochure", "topic": "efficacy"},
        {"id": "mat_205", "title": "Product X Phase III data PDF", "topic": "phase iii"},
        {"id": "mat_310", "title": "Safety profile card", "topic": "safety"},
        {"id": "mat_411", "title": "Patient starter guide", "topic": "patient education"},
        {"id": "mat_512", "title": "Reimbursement FAQ", "topic": "access"}
    ]
    topic_lower = topic.lower()
    return [item for item in catalog if item["topic"] in topic_lower or item["title"].lower() in topic_lower] or catalog[:2]


@tool
def recommend_followups(interaction: dict[str, Any]) -> list[str]:
    """Recommend next best sales actions based on sentiment, content, and compliance state."""
    sentiment = interaction.get("sentiment", "Neutral")
    actions = ["Send only approved materials referenced during the call."]
    if sentiment == "Positive":
        actions.extend([
            "Schedule a deeper efficacy discussion in 14 days.",
            "Invite HCP to the next compliant peer education session."
        ])
    elif sentiment == "Negative":
        actions.extend([
            "Log objection themes for coaching.",
            "Ask Medical Affairs to respond to clinical evidence questions."
        ])
    else:
        actions.extend([
            "Send concise Phase III summary.",
            "Book a follow-up after HCP reviews the material."
        ])
    return actions


@tool
def schedule_followup(hcp_name: str, reason: str, days_from_now: int = 14) -> dict[str, str]:
    """Create a proposed follow-up task for the field representative."""
    followup_date = date.today() + timedelta(days=days_from_now)
    return {
        "hcp_name": hcp_name,
        "reason": reason,
        "due_date": followup_date.isoformat(),
        "status": "proposed"
    }


@tool
def log_interaction(note: str, current_draft: dict[str, Any] | None = None) -> dict[str, Any]:
    """Capture interaction data from free text using an LLM for summary, entity extraction, and field mapping."""
    llm = _get_llm()
    if llm is None:
        logger.error("GROQ_API_KEY is missing; using local fallback for log_interaction.")
        patch = _fallback_extract(note, current_draft)
        patch["ai_summary"] = "Drafted locally because GROQ_API_KEY is not configured."
        patch["extracted_entities"] = {"source": "fallback", "hcp_mentions": [], "products": ["Product X"] if "product x" in note.lower() else []}
        return patch

    try:
        response = _invoke_llm_with_timeout(
            llm,
            [
                SystemMessage(content=(
                    "You are a life sciences CRM assistant. Extract a compliant interaction draft as strict JSON. "
                    "Fields: hcp_name, interaction_type, attendees, topics_discussed, materials_shared, "
                    "samples_distributed, sentiment, outcomes, follow_up_actions, ai_summary, extracted_entities. "
                    "Use only Positive, Neutral, or Negative for sentiment. Do not invent sample distribution."
                )),
                HumanMessage(content=f"Current draft: {json.dumps(current_draft or {}, default=str)}\nConversation note: {note}")
            ],
            "log_interaction"
        )
        patch = _json_from_text(response.content)
        return patch or _fallback_extract(note, current_draft)
    except Exception:
        logger.exception("AI extraction failed; returning local fallback patch.")
        patch = _fallback_extract(note, current_draft)
        patch["ai_summary"] = "AI service temporarily unavailable; drafted locally from the note."
        patch["extracted_entities"] = {"source": "fallback", "hcp_mentions": [], "products": ["Product X"] if "product x" in note.lower() else []}
        return patch


@tool
def edit_interaction(instruction: str, current_draft: dict[str, Any]) -> dict[str, Any]:
    """Modify previously logged interaction data while preserving untouched fields."""
    llm = _get_llm()
    if llm is None:
        logger.error("GROQ_API_KEY is missing; using local fallback for edit_interaction.")
        patched = dict(current_draft)
        if "outcome" in instruction.lower():
            patched["outcomes"] = instruction
        elif "follow" in instruction.lower():
            patched["follow_up_actions"] = instruction
        else:
            patched["topics_discussed"] = instruction
        return patched

    try:
        response = _invoke_llm_with_timeout(
            llm,
            [
                SystemMessage(content=(
                    "You edit an HCP interaction draft. Return the full updated draft as strict JSON, preserving fields "
                    "not mentioned in the instruction. Keep promotional language compliant and factual."
                )),
                HumanMessage(content=f"Draft: {json.dumps(current_draft, default=str)}\nEdit instruction: {instruction}")
            ],
            "edit_interaction"
        )
        return _json_from_text(response.content) or current_draft
    except Exception:
        logger.exception("AI edit failed; returning conservative fallback patch.")
        patched = dict(current_draft)
        if "outcome" in instruction.lower():
            patched["outcomes"] = instruction
        elif "follow" in instruction.lower():
            patched["follow_up_actions"] = instruction
        else:
            patched["topics_discussed"] = instruction
        patched["ai_summary"] = "AI service temporarily unavailable; applied a conservative local edit."
        return patched
