import logging
import time
from concurrent.futures import ThreadPoolExecutor, TimeoutError
from typing import Any, Callable

from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from .agent_graph import hcp_interaction_agent
from .agent_tools import (
    check_compliance,
    edit_interaction,
    fetch_hcp_profile,
    log_interaction,
    recommend_followups,
    search_approved_materials,
)
from .config import get_settings
from .database import Base, SessionLocal, engine, get_db
from .models import HCP, Interaction
from .schemas import AgentRequest, AgentResponse, AgentToolRequest, InteractionCreate, InteractionRead, InteractionUpdate


settings = get_settings()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s"
)
logger = logging.getLogger("ai_crm.api")

app = FastAPI(
    title="AI-first CRM HCP Module",
    description="FastAPI backend for logging Healthcare Professional interactions with a LangGraph/Groq agent.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://ai-crm-hcp-module.vercel.app",
        "http://localhost:5173",
        
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    logger.info("request start method=%s path=%s origin=%s", request.method, request.url.path, request.headers.get("origin", ""))
    try:
        response = await call_next(request)
        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
        logger.info("request complete method=%s path=%s status=%s elapsed_ms=%s", request.method, request.url.path, response.status_code, elapsed_ms)
        return response
    except Exception:
        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
        logger.exception("request error method=%s path=%s elapsed_ms=%s", request.method, request.url.path, elapsed_ms)
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": "Backend service temporarily unavailable"}
        )


def _safe_tool_call(tool, payload: dict[str, Any], fallback: Any, name: str) -> Any:
    try:
        return tool.invoke(payload)
    except Exception:
        logger.exception("tool failed name=%s", name)
        return fallback


def _run_with_timeout(name: str, fn: Callable[[], Any]) -> Any:
    logger.info("before AI workflow name=%s timeout_seconds=%s", name, settings.ai_request_timeout_seconds)
    executor = ThreadPoolExecutor(max_workers=1)
    future = executor.submit(fn)
    try:
        result = future.result(timeout=settings.ai_request_timeout_seconds)
        logger.info("after AI workflow name=%s", name)
        return result
    except TimeoutError:
        future.cancel()
        logger.exception("AI workflow timed out name=%s timeout_seconds=%s", name, settings.ai_request_timeout_seconds)
        raise
    except Exception:
        logger.exception("AI workflow failed name=%s", name)
        raise
    finally:
        executor.shutdown(wait=False, cancel_futures=True)


def _ai_unavailable_response(tool_calls: list[str] | None = None) -> AgentResponse:
    return AgentResponse(
        success=False,
        message="AI service temporarily unavailable",
        response="AI service is temporarily unavailable. You can still complete and save the structured CRM log manually.",
        interaction_patch={},
        tool_calls=tool_calls or []
    )


def _normalize_interaction_patch(patch: dict) -> dict:
    aliases = {
        "outcome": "outcomes",
        "follow_up_action": "follow_up_actions",
        "followup_actions": "follow_up_actions",
        "material_shared": "materials_shared",
        "sample_distributed": "samples_distributed"
    }
    normalized = dict(patch)
    for alias, field in aliases.items():
        if alias in normalized and field not in normalized:
            normalized[field] = normalized.pop(alias)
    return normalized


@app.on_event("startup")
def startup() -> None:
    if not settings.groq_api_key:
        logger.error("GROQ_API_KEY is missing. AI requests will use local fallbacks until the Render environment variable is configured.")
    else:
        logger.info("GROQ_API_KEY is configured. Groq model=%s", settings.groq_model)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        if db.query(HCP).count() == 0:
            db.add_all([
                HCP(
                    id="hcp_1001",
                    full_name="Dr. Priya Menon",
                    specialty="Endocrinology",
                    tier="A",
                    organization="MetroCare Diabetes Center",
                    territory="South Zone",
                    consent_status="marketing_opt_in"
                ),
                HCP(
                    id="hcp_1002",
                    full_name="Dr. Arjun Shah",
                    specialty="Cardiology",
                    tier="B",
                    organization="Northline Hospital",
                    territory="West Zone",
                    consent_status="limited"
                )
            ])
            db.commit()


@app.options("/{full_path:path}")
def options_preflight(full_path: str) -> Response:
    return Response(status_code=204)


def health_payload() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "ai-crm-api"
    }


@app.get("/health")
@app.get("/api/health")
def health() -> dict[str, str]:
    return health_payload()


@app.get("/api/hcps")
def list_hcps(db: Session = Depends(get_db)) -> list[dict[str, str]]:
    return [
        {
            "id": hcp.id,
            "full_name": hcp.full_name,
            "specialty": hcp.specialty,
            "tier": hcp.tier,
            "organization": hcp.organization,
            "territory": hcp.territory,
            "consent_status": hcp.consent_status
        }
        for hcp in db.query(HCP).order_by(HCP.full_name).all()
    ]


@app.post("/api/interactions", response_model=InteractionRead)
def create_interaction(payload: InteractionCreate, db: Session = Depends(get_db)) -> Interaction:
    interaction_data = payload.model_dump()
    compliance_flags = _safe_tool_call(
        check_compliance,
        {"interaction": interaction_data},
        [],
        "check_compliance"
    )

    interaction = Interaction(
        **interaction_data,
        ai_summary=payload.topics_discussed or payload.outcomes,
        extracted_entities={},
        compliance_flags=compliance_flags
    )
    db.add(interaction)
    db.commit()
    db.refresh(interaction)
    return interaction


@app.patch("/api/interactions/{interaction_id}", response_model=InteractionRead)
def update_interaction(interaction_id: int, payload: InteractionUpdate, db: Session = Depends(get_db)) -> Interaction:
    interaction = db.get(Interaction, interaction_id)
    if interaction is None:
        raise HTTPException(status_code=404, detail="Interaction not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(interaction, field, value)
    interaction.compliance_flags = _safe_tool_call(
        check_compliance,
        {
            "interaction": {
                "topics_discussed": interaction.topics_discussed,
                "outcomes": interaction.outcomes,
                "follow_up_actions": interaction.follow_up_actions,
                "samples_distributed": interaction.samples_distributed,
                "consent_for_voice_summary": interaction.consent_for_voice_summary
            }
        },
        [],
        "check_compliance"
    )
    db.commit()
    db.refresh(interaction)
    return interaction


@app.post("/api/agent/chat", response_model=AgentResponse)
def chat_with_agent(payload: AgentRequest) -> AgentResponse:
    try:
        result = _run_with_timeout(
            "agent_chat",
            lambda: hcp_interaction_agent.invoke({
                "message": payload.message,
                "current_draft": payload.current_draft
            })
        )
        patch = result.get("interaction_patch", {})
        if result.get("compliance_flags"):
            patch["compliance_flags"] = result["compliance_flags"]
        return AgentResponse(
            success=True,
            message="ok",
            response=result.get("response", "I processed the interaction."),
            interaction_patch=patch,
            tool_calls=result.get("tool_calls", [])
        )
    except Exception:
        logger.exception("agent chat failed")
        return _ai_unavailable_response(["agent_chat"])


@app.post("/api/agent/tool", response_model=AgentResponse)
def run_agent_tool(payload: AgentToolRequest) -> AgentResponse:
    try:
        return _run_agent_tool(payload)
    except Exception:
        logger.exception("agent tool failed tool_name=%s", payload.tool_name)
        return _ai_unavailable_response([payload.tool_name])


def _run_agent_tool(payload: AgentToolRequest) -> AgentResponse:
    draft = payload.current_draft
    message = payload.message.strip()

    if payload.tool_name == "log_interaction":
        note = message or draft.get("topics_discussed") or draft.get("outcomes") or "Draft the current HCP interaction."
        patch = _normalize_interaction_patch(_run_with_timeout(
            "tool_log_interaction",
            lambda: log_interaction.invoke({"note": note, "current_draft": draft})
        ))
        flags = _safe_tool_call(check_compliance, {"interaction": {**draft, **patch}}, [], "check_compliance")
        if flags:
            patch["compliance_flags"] = flags
        return AgentResponse(
            success=True,
            message="ok",
            response="I used Log Interaction to turn the note into structured CRM fields.",
            interaction_patch=patch,
            tool_calls=["log_interaction", "check_compliance"]
        )

    if payload.tool_name == "edit_interaction":
        if not message:
            return AgentResponse(
                success=True,
                message="ok",
                response="Type what you want changed, then run Edit Interaction again.",
                interaction_patch={},
                tool_calls=["edit_interaction"]
            )
        patch = _normalize_interaction_patch(_run_with_timeout(
            "tool_edit_interaction",
            lambda: edit_interaction.invoke({"instruction": message, "current_draft": draft})
        ))
        flags = _safe_tool_call(check_compliance, {"interaction": patch}, [], "check_compliance")
        if flags:
            patch["compliance_flags"] = flags
        return AgentResponse(
            success=True,
            message="ok",
            response="I used Edit Interaction to update the current draft and recheck compliance.",
            interaction_patch=patch,
            tool_calls=["edit_interaction", "check_compliance"]
        )

    if payload.tool_name == "fetch_hcp_profile":
        profile = _safe_tool_call(
            fetch_hcp_profile,
            {"hcp_name": draft.get("hcp_name") or message},
            {"hcp_id": draft.get("hcp_id", "hcp_1001"), "hcp_name": draft.get("hcp_name", "Selected HCP"), "tier": "unknown", "specialty": "unknown", "organization": "unknown", "territory": "unknown", "consent_status": "unknown"},
            "fetch_hcp_profile"
        )
        return AgentResponse(
            success=True,
            message="ok",
            response=(
                f"{profile['hcp_name']} is a tier {profile['tier']} {profile['specialty']} HCP at "
                f"{profile['organization']} in {profile['territory']}. Consent status: {profile['consent_status']}."
            ),
            interaction_patch={"hcp_id": profile["hcp_id"], "hcp_name": profile["hcp_name"]},
            tool_calls=["fetch_hcp_profile"]
        )

    if payload.tool_name == "search_approved_materials":
        topic = message or draft.get("topics_discussed") or draft.get("outcomes") or "Product X"
        materials = _safe_tool_call(search_approved_materials, {"topic": topic}, [], "search_approved_materials")
        titles = [item["title"] for item in materials]
        return AgentResponse(
            success=True,
            message="ok",
            response=f"I found approved materials for this discussion: {', '.join(titles)}.",
            interaction_patch={"materials_shared": titles},
            tool_calls=["search_approved_materials"]
        )

    actions = _safe_tool_call(recommend_followups, {"interaction": draft}, ["Send only approved materials referenced during the call."], "recommend_followups")
    return AgentResponse(
        success=True,
        message="ok",
        response=f"I recommended compliant next steps: {'; '.join(actions)}",
        interaction_patch={"follow_up_actions": "; ".join(actions)},
        tool_calls=["recommend_followups"]
    )
