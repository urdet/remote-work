from pathlib import Path
import base64
import json

from model import AnalysisRequestError
from utils import analyze_capture_activity


PROJECT_ROOT = Path(__file__).resolve().parents[2]
SCREENSHOT_PATHS = [PROJECT_ROOT / "assets" / "test_capture.png"]
EMPLOYEE_PIN = "12"
CAPTURED_AT = "2026-04-27T10:03:00Z"


def main() -> None:
    missing_screenshots = [path for path in SCREENSHOT_PATHS if not path.exists()]
    if missing_screenshots:
        missing_paths = ", ".join(str(path) for path in missing_screenshots)
        raise FileNotFoundError(f"Screenshot not found: {missing_paths}")

    screenshot_base64 = image_to_base64(SCREENSHOT_PATHS[0])

    try:
        analysis = analyze_capture_activity(
            employee_pin=EMPLOYEE_PIN,
            captured_at=CAPTURED_AT,
            image_inputs=[screenshot_base64],
        )
        print("Capture analysis:")
        print(json.dumps(analysis, indent=2))
    except AnalysisRequestError as exc:
        print(f"Provider request failed with status {exc.status_code}: {exc}")
        if exc.retry_delay:
            print(f"Retry after: {exc.retry_delay}")


def image_to_base64(image_path: Path) -> str:
    encoded_image = base64.b64encode(image_path.read_bytes()).decode("utf-8")
    return f"data:image/png;base64,{encoded_image}"


if __name__ == "__main__":
    main()
