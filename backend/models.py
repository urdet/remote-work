from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, Integer, LargeBinary, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utc_now() -> datetime:
    return datetime.now(UTC)


class AgentTimerEvent(Base):
    __tablename__ = "agent_timer_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    employee_pin: Mapped[str] = mapped_column(String(32), index=True, default="1234")
    session_id: Mapped[str] = mapped_column(String(160), index=True)
    event_type: Mapped[str] = mapped_column(String(16))
    event_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    date_key: Mapped[str] = mapped_column(String(32), index=True)
    elapsed_seconds: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class AgentCapture(Base):
    __tablename__ = "agent_captures"

    id: Mapped[str] = mapped_column(String(220), primary_key=True)
    employee_pin: Mapped[str] = mapped_column(String(32), index=True, default="1234")
    session_id: Mapped[str] = mapped_column(String(160), index=True)
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    capture_mode: Mapped[str] = mapped_column(String(32), default="all")
    image_count: Mapped[int] = mapped_column(Integer, default=0)
    metadata_json: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    images: Mapped[list["AgentCaptureImage"]] = relationship(
        back_populates="capture",
        cascade="all, delete-orphan",
    )
    analysis: Mapped["AgentCaptureAnalysis | None"] = relationship(
        back_populates="capture",
        cascade="all, delete-orphan",
        uselist=False,
    )


class AgentCaptureImage(Base):
    __tablename__ = "agent_capture_images"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    capture_id: Mapped[str] = mapped_column(
        String(220),
        ForeignKey("agent_captures.id", ondelete="CASCADE"),
        index=True,
    )
    image_index: Mapped[int] = mapped_column(Integer)
    monitor_name: Mapped[str] = mapped_column(String(255))
    width: Mapped[int] = mapped_column(Integer)
    height: Mapped[int] = mapped_column(Integer)
    media_type: Mapped[str] = mapped_column(String(64), default="image/png")
    image_data: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    capture: Mapped[AgentCapture] = relationship(back_populates="images")


class AgentCaptureAnalysis(Base):
    __tablename__ = "agent_capture_analyses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    capture_id: Mapped[str] = mapped_column(
        String(220),
        ForeignKey("agent_captures.id", ondelete="CASCADE"),
        unique=True,
        index=True,
    )
    employee_pin: Mapped[str] = mapped_column(String(32), index=True)
    time: Mapped[str] = mapped_column(String(16))
    activity: Mapped[str] = mapped_column(String(255))
    apps: Mapped[str] = mapped_column(String(255), default="")
    details: Mapped[str] = mapped_column(String(500), default="")
    raw_json: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    capture: Mapped[AgentCapture] = relationship(back_populates="analysis")
