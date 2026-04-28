import { BACKEND_BASE_URL, DEFAULT_EMPLOYEE_PIN } from "../constants";

async function postBackend(path, payload) {
  const response = await fetch(`${BACKEND_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Backend ${response.status}: ${message || response.statusText}`);
  }

  return response.json();
}

export function storeTimerEvent({
  employeePin = DEFAULT_EMPLOYEE_PIN,
  sessionId,
  eventType,
  eventAt,
  dateKey,
  elapsedSeconds,
}) {
  return postBackend("/agent/timer-events", {
    employee_pin: employeePin,
    session_id: sessionId,
    event_type: eventType,
    event_at: eventAt,
    date_key: dateKey,
    elapsed_seconds: elapsedSeconds,
  });
}

export function storeCapture(capture, employeePin = DEFAULT_EMPLOYEE_PIN) {
  return postBackend("/agent/captures", {
    id: capture.id,
    employee_pin: employeePin,
    session_id: capture.session_id,
    captured_at: capture.captured_at,
    capture_mode: capture.capture_mode,
    images: capture.images,
  });
}
