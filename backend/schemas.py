from __future__ import annotations

from pydantic import BaseModel, Field


class AgentTimerEventRequest(BaseModel):
    employee_pin: str = Field(default="1234", min_length=1, max_length=32)
    session_id: str = Field(min_length=1, max_length=160)
    event_type: str = Field(pattern="^(start|stop)$")
    event_at: str
    date_key: str = Field(min_length=8, max_length=32)
    elapsed_seconds: int = Field(default=0, ge=0)


class AgentCaptureImageRequest(BaseModel):
    index: int = Field(ge=0)
    monitor_name: str = Field(min_length=1, max_length=255)
    width: int = Field(gt=0)
    height: int = Field(gt=0)
    data_url: str = Field(min_length=1)


class AgentCaptureRequest(BaseModel):
    id: str = Field(min_length=1, max_length=220)
    employee_pin: str = Field(default="1234", min_length=1, max_length=32)
    session_id: str = Field(min_length=1, max_length=160)
    captured_at: str
    capture_mode: str = Field(default="all", max_length=32)
    images: list[AgentCaptureImageRequest] = Field(min_length=1)
