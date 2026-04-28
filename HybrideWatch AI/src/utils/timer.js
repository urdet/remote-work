import {
  DAILY_TIMER_STORAGE_KEY,
  DEFAULT_MAX_DELAY_SECONDS,
  DEFAULT_MIN_DELAY_SECONDS,
  THEME_STORAGE_KEY,
} from "../constants";

export function randomDelay(minSeconds, maxSeconds) {
  const min = Math.max(1, Number(minSeconds) || DEFAULT_MIN_DELAY_SECONDS);
  const max = Math.max(min, Number(maxSeconds) || DEFAULT_MAX_DELAY_SECONDS);
  return Math.round((min + Math.random() * (max - min)) * 1000);
}

export function formatDuration(seconds) {
  const safeSeconds = Math.max(0, Math.floor(seconds || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainder = safeSeconds % 60;
  return [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    String(remainder).padStart(2, "0"),
  ].join(":");
}

export function formatDurationWords(seconds) {
  const safeSeconds = Math.max(0, Math.floor(seconds || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainder = safeSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${remainder}s`;
  if (minutes > 0) return `${minutes}m ${remainder}s`;
  return `${remainder}s`;
}

export function currentDateKey() {
  return new Date().toISOString().slice(0, 10);
}

export function loadDailyTimerState() {
  try {
    const saved = JSON.parse(localStorage.getItem(DAILY_TIMER_STORAGE_KEY) || "{}");
    if (saved.dateKey === currentDateKey()) {
      return { dateKey: saved.dateKey, elapsedSeconds: Number(saved.elapsedSeconds) || 0 };
    }
  } catch {
    // Ignore invalid persisted state.
  }
  return { dateKey: currentDateKey(), elapsedSeconds: 0 };
}

export function saveDailyTimerState(dateKey, elapsedSeconds) {
  localStorage.setItem(
    DAILY_TIMER_STORAGE_KEY,
    JSON.stringify({ dateKey, elapsedSeconds: Math.max(0, Math.floor(elapsedSeconds)) })
  );
}

export function loadTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) || "dark";
  } catch {
    return "dark";
  }
}

export function isMiniWindow() {
  return new URLSearchParams(window.location.search).get("mini") === "1";
}

export function timerPayload({ isRunning, elapsedSeconds, dateKey }) {
  return { isRunning, elapsedSeconds, dateKey, updatedAt: Date.now() };
}

export function buildCapturePayload({ sessionId, capturedAt, shots }) {
  return {
    session_id: sessionId,
    captured_at: capturedAt,
    capture_mode: "all",
    selected_screen: null,
    upload_status: "pending",
    images: shots.map((shot, index) => ({
      index,
      monitor_name: shot.monitor_name,
      width: shot.width,
      height: shot.height,
      data_url: shot.data_url,
    })),
  };
}
