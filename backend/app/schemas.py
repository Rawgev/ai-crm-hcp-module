from datetime import date, time
from typing import Any, Literal

from pydantic import BaseModel, Field


Sentiment = Literal["Positive", "Neutral", "Negative"]


class InteractionBase(BaseModel):
    hcp_id: str = "hcp_1001"
    hcp_name: str
    interaction_type: str
    interaction_date: date
    interaction_time: time
    attendees: str = ""
    topics_discussed: str = ""
    materials_shared: list[str] = Field(default_factory=list)
    samples_distributed: list[str] = Field(default_factory=list)
    sentiment: Sentiment = "Neutral"
    outcomes: str = ""
    follow_up_actions: str = ""
    channel: str = "field_visit"
    consent_for_voice_summary: bool = False


class InteractionCreate(InteractionBase):
    pass


class InteractionUpdate(BaseModel):
    hcp_name: str | None = None
    interaction_type: str | None = None
    attendees: str | None = None
    topics_discussed: str | None = None
    materials_shared: list[str] | None = None
    samples_distributed: list[str] | None = None
    sentiment: Sentiment | None = None
    outcomes: str | None = None
    follow_up_actions: str | None = None
    compliance_flags: list[str] | None = None


class InteractionRead(InteractionBase):
    id: int
    ai_summary: str = ""
    extracted_entities: dict[str, Any] = Field(default_factory=dict)
    compliance_flags: list[str] = Field(default_factory=list)

    class Config:
        from_attributes = True


class AgentRequest(BaseModel):
    message: str
    current_draft: dict[str, Any] = Field(default_factory=dict)


class AgentToolRequest(AgentRequest):
    tool_name: Literal[
        "log_interaction",
        "edit_interaction",
        "fetch_hcp_profile",
        "search_approved_materials",
        "recommend_followups"
    ]


class AgentResponse(BaseModel):
    success: bool = True
    message: str = ""
    response: str
    interaction_patch: dict[str, Any] = Field(default_factory=dict)
    tool_calls: list[str] = Field(default_factory=list)
