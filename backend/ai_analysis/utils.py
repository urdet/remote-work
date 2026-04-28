"""High-level AI analysis helpers for capture screenshots."""

from __future__ import annotations

import base64
import binascii
from io import BytesIO
import math
import os
from pathlib import Path
import re
import time
from typing import Any, TypeAlias

from PIL import Image, ImageDraw, ImageOps, UnidentifiedImageError

try:
    from .model import (
        AnalysisRequestError,
        DEFAULT_GEMINI_MODEL_NAME,
        DEFAULT_GROQ_MODEL_NAME,
        GeminiAnalysisModel,
        GeminiConfig,
        GroqAnalysisModel,
        GroqConfig,
        get_analysis_provider,
    )
except ImportError:
    from model import (
        AnalysisRequestError,
        DEFAULT_GEMINI_MODEL_NAME,
        DEFAULT_GROQ_MODEL_NAME,
        GeminiAnalysisModel,
        GeminiConfig,
        GroqAnalysisModel,
        GroqConfig,
        get_analysis_provider,
    )


ImageInput: TypeAlias = str | Path
PILImage: TypeAlias = Image.Image
AnalysisModel: TypeAlias = GeminiAnalysisModel | GroqAnalysisModel
MAX_ANALYSIS_IMAGE_SIDE = 1280
MAX_ANALYSIS_IMAGES = 4
ANALYSIS_RETRY_DELAYS = (1.0, 2.5, 5.0)


def create_analysis_model(
    model_name: str | None = None,
    max_output_tokens: int = 1024,
) -> AnalysisModel:
    """Create the configured analysis model."""

    provider = get_analysis_provider()
    if provider == "groq":
        selected_model = (
            model_name
            or os.getenv("GROQ_MODEL_NAME")
            or DEFAULT_GROQ_MODEL_NAME
        )
        return GroqAnalysisModel(
            GroqConfig(
                model_name=selected_model,
                max_output_tokens=max_output_tokens,
            )
        )

    selected_model = (
        model_name
        or os.getenv("GEMINI_MODEL_NAME")
        or DEFAULT_GEMINI_MODEL_NAME
    )
    return GeminiAnalysisModel(
        GeminiConfig(
            model_name=selected_model,
            max_output_tokens=max_output_tokens,
        )
    )


def analyze_capture_activity(
    employee_pin: str,
    captured_at: str,
    image_inputs: ImageInput | list[ImageInput],
    model: AnalysisModel | None = None,
) -> dict[str, Any]:
    """Analyze one capture and return the normalized employee activity schema."""

    model = model or create_analysis_model(max_output_tokens=512)
    prompt = _build_capture_activity_prompt(employee_pin=employee_pin, captured_at=captured_at)
    response_text = _generate_with_images_with_retry(model, prompt, image_inputs)
    payload = model._parse_json_response(response_text)
    normalized = _normalize_capture_activity_payload(
        payload,
        employee_pin=employee_pin,
        captured_at=captured_at,
    )
    if _is_placeholder_activity(normalized["activity"]):
        repaired_payload = _repair_capture_activity_payload(
            model=model,
            original_response=response_text,
            employee_pin=employee_pin,
            captured_at=captured_at,
        )
        normalized = _normalize_capture_activity_payload(
            repaired_payload,
            employee_pin=employee_pin,
            captured_at=captured_at,
        )
    if _is_placeholder_activity(normalized["activity"]):
        raise ValueError("Model did not return a meaningful activity label.")
    return normalized


def _build_capture_activity_prompt(employee_pin: str, captured_at: str) -> str:
    return (
        "You are an AI assistant that analyzes employee screenshots.\n\n"
        "Look at the attached screenshots and summarize the employee's current computer activity.\n"
        "Be factual, concise, and avoid speculation beyond what is visible.\n"
        "Use visible evidence such as websites, app chrome, document titles, chat tools, IDEs, dashboards, terminals, or media players.\n\n"
        "Return only valid JSON in exactly this schema:\n"
        "{\n"
        '  "employee_pin": 12,\n'
        '  "time": "10:03",\n'
        '  "activity": "Watching YouTube",\n'
        '  "apps": "Chrome",\n'
        '  "details": "Video playing"\n'
        "}\n\n"
        f"Employee PIN: {employee_pin}\n"
        f"Capture timestamp: {captured_at}\n\n"
        "Rules:\n"
        "- employee_pin must match the provided employee PIN\n"
        "- time must be in HH:MM 24-hour format based on the capture timestamp\n"
        "- activity should be a short specific label such as `Writing code in VS Code`, `Watching YouTube`, `Reading Gmail`, `In Slack chat`, or `Working in Excel`\n"
        "- activity must never be `Unknown activity`, `Unknown`, `N/A`, or empty\n"
        "- apps should list visible applications, comma-separated\n"
        "- details should be one short sentence describing the visible screen content\n"
        "- if the exact task is unclear, still choose the best visible activity from the open app/site/window title\n"
        "- Return JSON only, no markdown fences"
    )


def _generate_with_images(
    model: AnalysisModel,
    prompt: str,
    image_inputs: ImageInput | list[ImageInput],
) -> str:
    images: list[PILImage] = []
    try:
        for image_input in _normalize_image_inputs(image_inputs):
            if isinstance(image_input, Path):
                with Image.open(image_input) as image:
                    images.append(image.copy())
            else:
                images.append(base64_to_pil_image(image_input))

        prepared_images = _prepare_analysis_images(images)
        if isinstance(model, GroqAnalysisModel):
            groq_content = _build_groq_multimodal_content(prompt, prepared_images)
            return model.generate_content(groq_content)
        return model.generate_content([prompt, *prepared_images])
    finally:
        for image in images:
            image.close()


def _generate_with_images_with_retry(
    model: AnalysisModel,
    prompt: str,
    image_inputs: ImageInput | list[ImageInput],
) -> str:
    last_error: Exception | None = None
    for index, delay_seconds in enumerate((0.0, *ANALYSIS_RETRY_DELAYS)):
        if delay_seconds > 0:
            time.sleep(delay_seconds)
        try:
            return _generate_with_images(model, prompt, image_inputs)
        except AnalysisRequestError as exc:
            last_error = exc
            if not _is_retryable_provider_error(exc) or index == len(ANALYSIS_RETRY_DELAYS):
                raise
        except Exception:
            raise

    if last_error is not None:
        raise last_error
    raise RuntimeError("Image analysis failed unexpectedly.")


def _normalize_image_inputs(
    image_inputs: ImageInput | list[ImageInput],
) -> list[Path | str]:
    if isinstance(image_inputs, (str, Path)):
        inputs = [image_inputs]
    else:
        inputs = list(image_inputs)

    if not inputs:
        raise ValueError("At least one image input is required.")

    normalized_inputs: list[Path | str] = []
    missing_paths: list[Path] = []
    for image_input in inputs:
        if isinstance(image_input, Path):
            if image_input.exists():
                normalized_inputs.append(image_input)
            else:
                missing_paths.append(image_input)
            continue

        if _is_inline_image_data(image_input):
            normalized_inputs.append(image_input)
            continue

        try:
            path = Path(image_input)
            if path.exists():
                normalized_inputs.append(path)
            else:
                normalized_inputs.append(image_input)
        except OSError:
            normalized_inputs.append(image_input)

    if missing_paths:
        missing = ", ".join(str(path) for path in missing_paths)
        raise FileNotFoundError(f"Image not found: {missing}")

    return normalized_inputs


def base64_to_pil_image(base64_image: str) -> PILImage:
    encoded_image = _strip_base64_data_url(base64_image)
    try:
        image_bytes = base64.b64decode(encoded_image, validate=True)
    except binascii.Error as exc:
        raise ValueError("Invalid Base64 image data.") from exc

    try:
        with Image.open(BytesIO(image_bytes)) as image:
            return image.copy()
    except UnidentifiedImageError as exc:
        raise ValueError("Base64 data is not a valid image.") from exc


def _strip_base64_data_url(base64_image: str) -> str:
    if "," in base64_image and base64_image.lstrip().startswith("data:"):
        return base64_image.split(",", 1)[1].strip()
    return base64_image.strip()


def _is_inline_image_data(value: str) -> bool:
    stripped = value.lstrip()
    return stripped.startswith("data:image/") or stripped.startswith("/9j/") or stripped.startswith("iVBOR")


def _prepare_analysis_images(images: list[PILImage]) -> list[PILImage]:
    optimized = [_optimize_image(image) for image in images[:MAX_ANALYSIS_IMAGES]]
    if len(optimized) <= 1:
        return optimized
    return [_build_contact_sheet(optimized)]


def _optimize_image(image: PILImage) -> PILImage:
    optimized = image.copy()
    if getattr(optimized, "mode", "") not in {"RGB", "L"}:
        optimized = optimized.convert("RGB")

    width, height = optimized.size
    longest_side = max(width, height)
    if longest_side > MAX_ANALYSIS_IMAGE_SIDE:
        optimized = ImageOps.contain(
            optimized,
            (MAX_ANALYSIS_IMAGE_SIDE, MAX_ANALYSIS_IMAGE_SIDE),
            Image.Resampling.LANCZOS,
        )

    return optimized


def _build_contact_sheet(images: list[PILImage]) -> PILImage:
    if len(images) == 1:
        return images[0]

    padding = 16
    columns = 2 if len(images) > 1 else 1
    rows = math.ceil(len(images) / columns)
    cell_width = max(image.width for image in images)
    cell_height = max(image.height for image in images)
    sheet_width = columns * cell_width + padding * (columns + 1)
    sheet_height = rows * cell_height + padding * (rows + 1)

    sheet = Image.new("RGB", (sheet_width, sheet_height), color=(18, 18, 24))
    draw = ImageDraw.Draw(sheet)

    for index, image in enumerate(images):
        row = index // columns
        column = index % columns
        x = padding + column * (cell_width + padding)
        y = padding + row * (cell_height + padding)
        sheet.paste(image, (x, y))
        draw.rectangle(
            [x - 1, y - 1, x + image.width, y + image.height],
            outline=(70, 70, 90),
            width=1,
        )

    return sheet


def _is_retryable_provider_error(exc: AnalysisRequestError) -> bool:
    message = str(exc).lower()
    return (
        exc.status_code in {429, 500, 503}
        or "high demand" in message
        or "try again later" in message
        or "resource exhausted" in message
        or "overloaded" in message
        or "rate limit" in message
        or "temporarily unavailable" in message
    )


def _build_groq_multimodal_content(
    prompt: str,
    images: list[PILImage],
) -> list[dict[str, Any]]:
    content: list[dict[str, Any]] = [{"type": "text", "text": prompt}]
    for image in images:
        content.append(
            {
                "type": "image_url",
                "image_url": {"url": pil_image_to_data_url(image)},
            }
        )
    return content


def pil_image_to_data_url(image: PILImage) -> str:
    image_bytes = BytesIO()
    export_image = image
    if getattr(export_image, "mode", "") not in {"RGB", "L"}:
        export_image = export_image.convert("RGB")
    export_image.save(image_bytes, format="JPEG", quality=82, optimize=True)
    encoded = base64.b64encode(image_bytes.getvalue()).decode("utf-8")
    return f"data:image/jpeg;base64,{encoded}"


def _repair_capture_activity_payload(
    model: AnalysisModel,
    original_response: str,
    employee_pin: str,
    captured_at: str,
) -> dict[str, Any]:
    repair_prompt = (
        "Convert the following model output into valid JSON using exactly this schema:\n"
        "{\n"
        '  "employee_pin": 12,\n'
        '  "time": "10:03",\n'
        '  "activity": "Watching YouTube",\n'
        '  "apps": "Chrome",\n'
        '  "details": "Video playing"\n'
        "}\n\n"
        f"employee_pin must be {employee_pin}.\n"
        f"time must be based on {captured_at} in HH:MM format.\n"
        "activity must be specific and never be unknown, n/a, null, or empty.\n"
        "Use the strongest visible clue from the previous output.\n\n"
        "Previous output:\n"
        f"{original_response}"
    )
    repaired_text = model.generate(repair_prompt)
    return model._parse_json_response(repaired_text)


def _normalize_capture_activity_payload(
    payload: dict[str, Any],
    employee_pin: str,
    captured_at: str,
) -> dict[str, Any]:
    normalized_pin: int | str
    try:
        normalized_pin = int(employee_pin)
    except ValueError:
        normalized_pin = employee_pin

    capture_time = captured_at[11:16] if len(captured_at) >= 16 else "00:00"
    apps_value = payload.get("apps") or payload.get("application") or payload.get("app") or ""
    if isinstance(apps_value, list):
        apps_value = ", ".join(str(item).strip() for item in apps_value if str(item).strip())

    details_value = str(payload.get("details") or payload.get("reason") or "").strip()
    activity_value = _derive_activity(
        payload=payload,
        apps_value=str(apps_value).strip(),
        details_value=details_value,
    )

    return {
        "employee_pin": normalized_pin,
        "time": _normalize_capture_time(str(payload.get("time") or capture_time)),
        "activity": activity_value,
        "apps": str(apps_value).strip(),
        "details": details_value,
    }


def _normalize_capture_time(raw_time: str) -> str:
    match = re.search(r"\b(\d{2}:\d{2})\b", raw_time)
    if match:
        return match.group(1)
    return raw_time[:5] if raw_time else "00:00"


def _derive_activity(
    payload: dict[str, Any],
    apps_value: str,
    details_value: str,
) -> str:
    candidates = [
        payload.get("activity"),
        payload.get("summary"),
        payload.get("task"),
        payload.get("status"),
    ]
    for candidate in candidates:
        text = str(candidate or "").strip()
        if _is_meaningful_activity(text):
            return text

    app_names = [part.strip() for part in apps_value.split(",") if part.strip()]
    if app_names:
        first_app = app_names[0]
        if _is_meaningful_text(details_value):
            detail_label = details_value.rstrip(".")
            return f"{first_app}: {detail_label}"
        return f"Using {first_app}"

    if _is_meaningful_text(details_value):
        return details_value.rstrip(".")

    return "Unknown activity"


def _is_meaningful_activity(value: str) -> bool:
    return _is_meaningful_text(value) and not _is_placeholder_activity(value)


def _is_placeholder_activity(value: str) -> bool:
    normalized = value.strip().lower()
    return normalized in {
        "",
        "unknown",
        "unknown activity",
        "n/a",
        "na",
        "none",
        "null",
        "unclear",
        "not visible",
        "not sure",
    }


def _is_meaningful_text(value: str) -> bool:
    normalized = value.strip().lower()
    return normalized not in {
        "",
        "unknown",
        "n/a",
        "na",
        "none",
        "null",
        "unclear",
        "not visible",
        "not sure",
    }
