from __future__ import annotations

import base64
import binascii
from datetime import datetime

from sqlalchemy.orm import Session

from . import models
from .ai_analysis.model import AnalysisRequestError, get_analysis_provider
from .ai_analysis.utils import analyze_capture_activity
from .schemas import AgentCaptureRequest, AgentTimerEventRequest


def _parse_datetime(value: str) -> datetime:
    try:
        normalized = value.replace("Z", "+00:00")
        return datetime.fromisoformat(normalized)
    except ValueError as exc:
        raise ValueError(f"Invalid datetime: {value}") from exc


def _decode_data_url(data_url: str) -> tuple[str, bytes]:
    if "," not in data_url:
        raise ValueError("Invalid image data URL.")

    header, encoded = data_url.split(",", 1)
    media_type = "image/png"
    if header.startswith("data:") and ";base64" in header:
        media_type = header[5:].split(";", 1)[0] or media_type

    try:
        return media_type, base64.b64decode(encoded, validate=True)
    except (ValueError, binascii.Error) as exc:
        raise ValueError("Image payload is not valid base64.") from exc


def _is_high_demand_analysis_error(exc: AnalysisRequestError) -> bool:
    message = str(exc).lower()
    return (
        exc.status_code in {429, 500, 503}
        or "high demand" in message
        or "try again later" in message
        or "resource exhausted" in message
        or "overloaded" in message
    )


def _fallback_analysis_from_last_good(
    db: Session,
    employee_pin: str,
    captured_at: str,
) -> dict | None:
    recent_analyses = (
        db.query(models.AgentCaptureAnalysis)
        .filter(models.AgentCaptureAnalysis.employee_pin == employee_pin)
        .order_by(models.AgentCaptureAnalysis.created_at.desc())
        .limit(20)
        .all()
    )

    last_analysis = None
    for candidate in recent_analyses:
        raw_json = candidate.raw_json or {}
        activity = str(raw_json.get("activity") or "").strip().lower()
        if raw_json and activity and activity != "unknown activity" and activity != "unknown":
            last_analysis = candidate
            break
    if last_analysis is None:
        return None

    fallback = dict(last_analysis.raw_json)
    fallback["employee_pin"] = int(employee_pin) if employee_pin.isdigit() else employee_pin
    fallback["time"] = captured_at[11:16] if len(captured_at) >= 16 else str(fallback.get("time") or "00:00")[:5]
    fallback["activity"] = str(fallback.get("activity") or "Unknown activity").strip()
    fallback["apps"] = str(fallback.get("apps") or "").strip()
    fallback["details"] = str(fallback.get("details") or "").strip()
    return fallback


def _apply_fallback_analysis(
    db: Session,
    metadata_json: dict,
    payload: AgentCaptureRequest,
    analysis_error: str,
) -> dict | None:
    fallback_payload = _fallback_analysis_from_last_good(
        db=db,
        employee_pin=payload.employee_pin,
        captured_at=payload.captured_at,
    )
    if fallback_payload is None:
        metadata_json["analysis_error"] = analysis_error
        return None

    metadata_json["analysis"] = fallback_payload
    metadata_json["analysis_source"] = "fallback_last_good"
    metadata_json["analysis_error"] = analysis_error
    return fallback_payload


def create_timer_event(db: Session, payload: AgentTimerEventRequest) -> dict:
    event = models.AgentTimerEvent(
        employee_pin=payload.employee_pin,
        session_id=payload.session_id,
        event_type=payload.event_type,
        event_at=_parse_datetime(payload.event_at),
        date_key=payload.date_key,
        elapsed_seconds=payload.elapsed_seconds,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return {
        "id": event.id,
        "employee_pin": event.employee_pin,
        "session_id": event.session_id,
        "event_type": event.event_type,
        "event_at": event.event_at.isoformat(),
        "date_key": event.date_key,
        "elapsed_seconds": event.elapsed_seconds,
    }


def create_capture(db: Session, payload: AgentCaptureRequest) -> dict:
    metadata_json = {
        "monitor_names": [image.monitor_name for image in payload.images],
    }

    analysis_payload = None
    analysis_error = None
    analysis_provider = get_analysis_provider()
    try:
        analysis_payload = analyze_capture_activity(
            employee_pin=payload.employee_pin,
            captured_at=payload.captured_at,
            image_inputs=[image.data_url for image in payload.images],
        )
        metadata_json["analysis"] = analysis_payload
        metadata_json["analysis_source"] = analysis_provider
    except AnalysisRequestError as exc:
        analysis_error = str(exc)
        if _is_high_demand_analysis_error(exc):
            analysis_payload = _apply_fallback_analysis(
                db=db,
                metadata_json=metadata_json,
                payload=payload,
                analysis_error=analysis_error,
            )
        else:
            metadata_json["analysis_error"] = analysis_error
    except ValueError as exc:
        analysis_error = str(exc)
        analysis_payload = _apply_fallback_analysis(
            db=db,
            metadata_json=metadata_json,
            payload=payload,
            analysis_error=analysis_error,
        )
    except Exception as exc:
        analysis_error = str(exc)
        metadata_json["analysis_error"] = analysis_error

    capture = models.AgentCapture(
        id=payload.id,
        employee_pin=payload.employee_pin,
        session_id=payload.session_id,
        captured_at=_parse_datetime(payload.captured_at),
        capture_mode=payload.capture_mode,
        image_count=len(payload.images),
        metadata_json=metadata_json,
    )

    for image in payload.images:
        media_type, binary = _decode_data_url(image.data_url)
        capture.images.append(
            models.AgentCaptureImage(
                image_index=image.index,
                monitor_name=image.monitor_name,
                width=image.width,
                height=image.height,
                media_type=media_type,
                image_data=binary,
            )
        )

    if analysis_payload is not None:
        capture.analysis = models.AgentCaptureAnalysis(
            employee_pin=payload.employee_pin,
            time=str(analysis_payload["time"]),
            activity=str(analysis_payload["activity"]),
            apps=str(analysis_payload["apps"]),
            details=str(analysis_payload["details"]),
            raw_json=analysis_payload,
        )

    db.add(capture)
    db.commit()
    db.refresh(capture)
    return {
        "id": capture.id,
        "employee_pin": capture.employee_pin,
        "session_id": capture.session_id,
        "captured_at": capture.captured_at.isoformat(),
        "capture_mode": capture.capture_mode,
        "image_count": capture.image_count,
        "analysis": analysis_payload,
        "analysis_error": analysis_error,
        "analysis_source": capture.metadata_json.get("analysis_source"),
    }


def list_timer_events(db: Session, limit: int = 100) -> list[dict]:
    events = (
        db.query(models.AgentTimerEvent)
        .order_by(models.AgentTimerEvent.event_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": event.id,
            "employee_pin": event.employee_pin,
            "session_id": event.session_id,
            "event_type": event.event_type,
            "event_at": event.event_at.isoformat(),
            "date_key": event.date_key,
            "elapsed_seconds": event.elapsed_seconds,
        }
        for event in events
    ]


def list_captures(db: Session, limit: int = 50) -> list[dict]:
    captures = (
        db.query(models.AgentCapture)
        .order_by(models.AgentCapture.captured_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": capture.id,
            "employee_pin": capture.employee_pin,
            "session_id": capture.session_id,
            "captured_at": capture.captured_at.isoformat(),
            "capture_mode": capture.capture_mode,
            "image_count": capture.image_count,
            "analysis": capture.analysis.raw_json if capture.analysis else capture.metadata_json.get("analysis"),
            "analysis_error": capture.metadata_json.get("analysis_error"),
            "analysis_source": capture.metadata_json.get("analysis_source"),
            "images": [
                {
                    "id": image.id,
                    "index": image.image_index,
                    "monitor_name": image.monitor_name,
                    "width": image.width,
                    "height": image.height,
                    "media_type": image.media_type,
                }
                for image in sorted(capture.images, key=lambda item: item.image_index)
            ],
        }
        for capture in captures
    ]


def get_status_by_pin(db: Session, employee_pin: str) -> dict:
    event = (
        db.query(models.AgentTimerEvent)
        .filter(models.AgentTimerEvent.employee_pin == employee_pin)
        .order_by(models.AgentTimerEvent.event_at.desc())
        .first()
    )
    return {"status": "running" if event and event.event_type == "start" else "stopped"}


def get_screenshots_by_date_and_pin(db: Session, date_key: str, employee_pin: str) -> list[dict]:
    captures = (
        db.query(models.AgentCapture)
        .filter(
            models.AgentCapture.employee_pin == employee_pin,
            models.AgentCapture.captured_at >= _parse_datetime(f"{date_key}T00:00:00"),
            models.AgentCapture.captured_at < _parse_datetime(f"{date_key}T23:59:59.999999"),
        )
        .order_by(models.AgentCapture.captured_at.desc())
        .all()
    )
    return [_capture_dict(capture) for capture in captures]


def get_activities_by_date(db: Session, date_key: str) -> list[dict]:
    captures = (
        db.query(models.AgentCapture)
        .filter(
            models.AgentCapture.captured_at >= _parse_datetime(f"{date_key}T00:00:00"),
            models.AgentCapture.captured_at < _parse_datetime(f"{date_key}T23:59:59.999999"),
        )
        .order_by(models.AgentCapture.captured_at.desc())
        .all()
    )
    return [
        {
            "capture_id": capture.id,
            "employee_pin": capture.employee_pin,
            "session_id": capture.session_id,
            "captured_at": capture.captured_at.isoformat(),
            "analysis": capture.analysis.raw_json if capture.analysis else capture.metadata_json.get("analysis"),
            "analysis_source": capture.metadata_json.get("analysis_source"),
            "metadata": capture.metadata_json,
        }
        for capture in captures
    ]


def get_timing_task(db: Session, date_key: str, task_id: str) -> dict:
    events = (
        db.query(models.AgentTimerEvent)
        .filter(
            models.AgentTimerEvent.date_key == date_key,
            models.AgentTimerEvent.session_id == task_id,
        )
        .order_by(models.AgentTimerEvent.event_at.asc())
        .all()
    )
    total_seconds = max((event.elapsed_seconds for event in events), default=0)
    final_status = "running" if events and events[-1].event_type == "start" else "stopped"
    return {
        "task_id": task_id,
        "date": date_key,
        "total_seconds": total_seconds,
        "status": final_status,
        "logs": [_timer_event_dict(event) for event in events],
    }


def get_timings_day(db: Session, date_key: str) -> dict:
    events = (
        db.query(models.AgentTimerEvent)
        .filter(models.AgentTimerEvent.date_key == date_key)
        .order_by(models.AgentTimerEvent.event_at.asc())
        .all()
    )
    totals_by_session: dict[str, int] = {}
    for event in events:
        totals_by_session[event.session_id] = max(
            totals_by_session.get(event.session_id, 0),
            event.elapsed_seconds,
        )
    return {
        "date": date_key,
        "total_seconds": sum(totals_by_session.values()),
        "logs": [_timer_event_dict(event) for event in events],
    }


def get_general_report(db: Session, date_key: str) -> dict:
    captures = get_activities_by_date(db, date_key)
    timings = get_timings_day(db, date_key)
    return {
        "date": date_key,
        "tasks": [],
        "activities": captures,
        "timings": timings,
        "productivity": {
            "total_seconds": timings["total_seconds"],
            "capture_count": len(captures),
        },
    }


def _timer_event_dict(event: models.AgentTimerEvent) -> dict:
    return {
        "id": event.id,
        "employee_pin": event.employee_pin,
        "session_id": event.session_id,
        "event_type": event.event_type,
        "event_at": event.event_at.isoformat(),
        "date_key": event.date_key,
        "elapsed_seconds": event.elapsed_seconds,
    }


def _capture_dict(capture: models.AgentCapture) -> dict:
    return {
        "id": capture.id,
        "employee_pin": capture.employee_pin,
        "session_id": capture.session_id,
        "captured_at": capture.captured_at.isoformat(),
        "capture_mode": capture.capture_mode,
        "image_count": capture.image_count,
        "analysis": capture.analysis.raw_json if capture.analysis else capture.metadata_json.get("analysis"),
        "analysis_error": capture.metadata_json.get("analysis_error"),
        "images": [
            {
                "id": image.id,
                "index": image.image_index,
                "monitor_name": image.monitor_name,
                "width": image.width,
                "height": image.height,
                "media_type": image.media_type,
            }
            for image in sorted(capture.images, key=lambda item: item.image_index)
        ],
    }
