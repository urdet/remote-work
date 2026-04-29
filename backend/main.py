from __future__ import annotations

from contextlib import asynccontextmanager
import os

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from . import crud, models
from .database import SessionLocal, engine
from .schemas import (
    AgentCaptureRequest,
    AgentTimerEventRequest,
)


DEFAULT_EMPLOYEE_PIN = os.getenv("DEFAULT_EMPLOYEE_PIN", "1234")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    models.Base.metadata.create_all(bind=engine)
    ensure_employee_pin_columns()
    yield


def ensure_employee_pin_columns() -> None:
    safe_default_pin = DEFAULT_EMPLOYEE_PIN.replace("'", "''")
    with engine.begin() as connection:
        connection.execute(text(
            "ALTER TABLE agent_timer_events "
            f"ADD COLUMN IF NOT EXISTS employee_pin VARCHAR(32) NOT NULL DEFAULT '{safe_default_pin}'"
        ))
        connection.execute(text(
            "ALTER TABLE agent_captures "
            f"ADD COLUMN IF NOT EXISTS employee_pin VARCHAR(32) NOT NULL DEFAULT '{safe_default_pin}'"
        ))
        connection.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_agent_timer_events_employee_pin "
            "ON agent_timer_events (employee_pin)"
        ))
        connection.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_agent_captures_employee_pin "
            "ON agent_captures (employee_pin)"
        ))


app = FastAPI(title="SmartPresence Agent Desktop Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv(
        "BACKEND_CORS_ORIGINS",
        ",".join(
            [
                "http://localhost:5173",
                "http://localhost:1420",
                "http://tauri.localhost",
                "https://tauri.localhost",
                "tauri://localhost",
            ]
        ),
    ).split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "SmartPresence agent desktop backend is running"}


@app.get("/health")
def health(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"backend": True, "database": True}


@app.get("/status/{employee_pin}")
def get_employee_status(employee_pin: str, db: Session = Depends(get_db)):
    return crud.get_status_by_pin(db, employee_pin)


@app.get("/getScreenshots/{date}/{employee_pin}")
def get_screenshots(date: str, employee_pin: str, db: Session = Depends(get_db)):
    try:
        return {"items": crud.get_screenshots_by_date_and_pin(db, date, employee_pin)}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/getTimingsDay/{date}/{employee_pin}")
def get_timings_day(date: str, employee_pin: str, db: Session = Depends(get_db)):
    return crud.get_timings_day(db, date, employee_pin)


@app.get("/getGeneralReport/{date}/{employee_pin}")
def get_general_report(date: str, employee_pin: str, db: Session = Depends(get_db)):
    return crud.get_general_report(db, date, employee_pin)


@app.get("/agent/timer-events")
def list_agent_timer_events(limit: int = 100, db: Session = Depends(get_db)):
    return {"items": crud.list_timer_events(db, limit=max(1, min(limit, 500)))}


@app.get("/agent/captures")
def list_agent_captures(limit: int = 50, db: Session = Depends(get_db)):
    return {"items": crud.list_captures(db, limit=max(1, min(limit, 200)))}


@app.post("/agent/timer-events")
def create_agent_timer_event(
    payload: AgentTimerEventRequest,
    db: Session = Depends(get_db),
):
    try:
        return crud.create_timer_event(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/agent/captures")
def create_agent_capture(
    payload: AgentCaptureRequest,
    db: Session = Depends(get_db),
):
    try:
        return crud.create_capture(db, payload)
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Capture already exists.") from exc


@app.get("/agent/captures/{capture_id}/images/{image_index}")
def get_capture_image(
    capture_id: str,
    image_index: int,
    db: Session = Depends(get_db),
):
    image = (
        db.query(models.AgentCaptureImage)
        .filter(
            models.AgentCaptureImage.capture_id == capture_id,
            models.AgentCaptureImage.image_index == image_index,
        )
        .first()
    )
    if image is None:
        raise HTTPException(status_code=404, detail="Capture image not found.")

    return Response(content=image.image_data, media_type=image.media_type)
