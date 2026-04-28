export const DEFAULT_MIN_DELAY_SECONDS = 3;
export const DEFAULT_MAX_DELAY_SECONDS = 180;
export const MAX_CAPTURE_RECORDS = 800;
export const DAILY_TIMER_STORAGE_KEY = "hybridewatch_daily_timer";
export const THEME_STORAGE_KEY = "hybridewatch_theme";
export const MINI_WINDOW_LABEL = "timer_popup";
export const MINI_WINDOW_WIDTH = 318;
export const MINI_WINDOW_HEIGHT = 118;
export const MINI_WINDOW_MARGIN = 130;
export const MINI_WINDOW_TOP_MARGIN = 50;
export const CAPTURE_UPLOAD_DELAY_MS = 15_000;
export const BACKEND_BASE_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:8001";
export const DEFAULT_EMPLOYEE_PIN =
  import.meta.env.VITE_EMPLOYEE_PIN || "1234";
