from datetime import date, datetime, time

from sqlalchemy import JSON, Boolean, Date, DateTime, ForeignKey, String, Text, Time, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class HCP(Base):
    __tablename__ = "hcps"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    full_name: Mapped[str] = mapped_column(String(160), nullable=False)
    specialty: Mapped[str] = mapped_column(String(120), nullable=False)
    tier: Mapped[str] = mapped_column(String(40), nullable=False, default="B")
    organization: Mapped[str] = mapped_column(String(180), nullable=False)
    territory: Mapped[str] = mapped_column(String(120), nullable=False)
    consent_status: Mapped[str] = mapped_column(String(40), nullable=False, default="unknown")

    interactions: Mapped[list["Interaction"]] = relationship(back_populates="hcp")


class Interaction(Base):
    __tablename__ = "interactions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    hcp_id: Mapped[str] = mapped_column(ForeignKey("hcps.id"), nullable=False)
    hcp_name: Mapped[str] = mapped_column(String(160), nullable=False)
    interaction_type: Mapped[str] = mapped_column(String(80), nullable=False)
    interaction_date: Mapped[date] = mapped_column(Date, nullable=False)
    interaction_time: Mapped[time] = mapped_column(Time, nullable=False)
    attendees: Mapped[str] = mapped_column(Text, default="")
    topics_discussed: Mapped[str] = mapped_column(Text, default="")
    materials_shared: Mapped[list[str]] = mapped_column(JSON, default=list)
    samples_distributed: Mapped[list[str]] = mapped_column(JSON, default=list)
    sentiment: Mapped[str] = mapped_column(String(40), default="Neutral")
    outcomes: Mapped[str] = mapped_column(Text, default="")
    follow_up_actions: Mapped[str] = mapped_column(Text, default="")
    ai_summary: Mapped[str] = mapped_column(Text, default="")
    extracted_entities: Mapped[dict] = mapped_column(JSON, default=dict)
    compliance_flags: Mapped[list[str]] = mapped_column(JSON, default=list)
    channel: Mapped[str] = mapped_column(String(80), default="field_visit")
    consent_for_voice_summary: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    hcp: Mapped[HCP] = relationship(back_populates="interactions")
