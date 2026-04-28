import { useEffect, useMemo, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import {
  getCurrentWindow,
  LogicalSize,
  PhysicalPosition,
  primaryMonitor,
} from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

import {
  CAPTURE_UPLOAD_DELAY_MS,
  DEFAULT_MAX_DELAY_SECONDS,
  DEFAULT_MIN_DELAY_SECONDS,
  MAX_CAPTURE_RECORDS,
  MINI_WINDOW_HEIGHT,
  MINI_WINDOW_LABEL,
  MINI_WINDOW_MARGIN,
  MINI_WINDOW_TOP_MARGIN,
  MINI_WINDOW_WIDTH,
} from "../constants";
import { callTauri, emitTimerState, isTauriRuntime } from "../api/tauri";
import { storeCapture, storeTimerEvent } from "../api/backend";
import {
  buildCapturePayload,
  currentDateKey,
  formatDuration,
  formatDurationWords,
  loadDailyTimerState,
  randomDelay,
  saveDailyTimerState,
  timerPayload,
} from "../utils/timer";

function publishTimerPayload(payload) {
  return emitTimerState(payload);
}
export default function MainTimerWindow({ theme, onToggleTheme, employeePin }) {
  const initialDailyState = useMemo(() => loadDailyTimerState(), []);
  const [captures, setCaptures] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [startedAt, setStartedAt] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(initialDailyState.elapsedSeconds);
  const [dateKey, setDateKey] = useState(initialDailyState.dateKey);
  const [nextCaptureAt, setNextCaptureAt] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState("");
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const timerRef = useRef(null);
  const tickerRef = useRef(null);
  const minimizeWatcherRef = useRef(null);
  const uploadTimersRef = useRef(new Map());
  const runningRef = useRef(false);
  const miniVisibleRef = useRef(false);
  const miniWindowRef = useRef(null);
  const miniWindowOpRef = useRef(null);
  const windowFocusedRef = useRef(true);
  const timerActionHandlerRef = useRef(null);
  const elapsedBeforeRunRef = useRef(initialDailyState.elapsedSeconds);
  const elapsedSecondsRef = useRef(initialDailyState.elapsedSeconds);
  const startedAtRef = useRef(null);
  const dateKeyRef = useRef(initialDailyState.dateKey);
  const sessionIdRef = useRef("");

  const pendingUploadCount = useMemo(
    () => captures.filter((c) => c.upload_status === "pending").length,
    [captures]
  );

  useEffect(() => {
    return () => {
      clearScheduledCapture();
      clearInterval(tickerRef.current);
      clearInterval(minimizeWatcherRef.current);
      uploadTimersRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      uploadTimersRef.current.clear();
      hideMiniWindow().catch(() => {});
    };
  }, []);

  useEffect(() => { runningRef.current = isRunning; }, [isRunning]);
  useEffect(() => { elapsedSecondsRef.current = elapsedSeconds; }, [elapsedSeconds]);
  useEffect(() => { startedAtRef.current = startedAt; }, [startedAt]);
  useEffect(() => { dateKeyRef.current = dateKey; }, [dateKey]);
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);

  timerActionHandlerRef.current = (action) => {
    if (action === "pause") pauseSession();
    if (action === "resume") playSession();
    if (action === "request-state") publishCurrentTimerState().catch(() => {});
  };

  useEffect(() => {
    publishCurrentTimerState().catch(() => {});
  }, [isRunning, elapsedSeconds, dateKey]);

  useEffect(() => {
    let unlisten = null;
    async function setup() {
      if (!isTauriRuntime()) return;
      unlisten = await listen("timer-action", (event) => {
        timerActionHandlerRef.current?.(event.payload);
      });
    }
    setup().catch((e) => setError(String(e)));
    return () => { if (unlisten) unlisten(); };
  }, []);

  useEffect(() => {
    if (!isTauriRuntime()) return;
    let unlistenFocusChanged = null;
    clearInterval(minimizeWatcherRef.current);

    async function updatePopupVisibility({ focused = windowFocusedRef.current } = {}) {
      windowFocusedRef.current = focused;
      const win = getCurrentWindow();
      const minimized = await win.isMinimized();
      const shouldShow = runningRef.current && (minimized || !windowFocusedRef.current);

      if (shouldShow && !miniVisibleRef.current) await showMiniWindow();
      else if (!shouldShow && miniVisibleRef.current) await hideMiniWindow();
    }

    getCurrentWindow()
      .onFocusChanged(({ payload: focused }) => {
        updatePopupVisibility({ focused }).catch(() => {});
      })
      .then((unlisten) => {
        unlistenFocusChanged = unlisten;
      })
      .catch(() => {});

    minimizeWatcherRef.current = setInterval(async () => {
      await updatePopupVisibility();
    }, 700);
    return () => {
      clearInterval(minimizeWatcherRef.current);
      if (unlistenFocusChanged) unlistenFocusChanged();
    };
  }, []);

  async function getMiniWindow() {
    if (miniWindowRef.current) return miniWindowRef.current;
    if (miniWindowOpRef.current) return miniWindowOpRef.current;

    miniWindowOpRef.current = (async () => {
      let popup = await WebviewWindow.getByLabel(MINI_WINDOW_LABEL);
      if (!popup) {
        const position = await miniWindowPosition();
        popup = new WebviewWindow(MINI_WINDOW_LABEL, {
          url: "/?mini=1",
          title: "HybrideWatch Timer",
          width: MINI_WINDOW_WIDTH,
          height: MINI_WINDOW_HEIGHT,
          x: position.x,
          y: position.y,
          resizable: true,
          minimizable: false,
          maximizable: false,
          decorations: true,
          alwaysOnTop: true,
          skipTaskbar: true,
          shadow: true,
          focus: false,
          transparent: false,
          backgroundColor: "#0c0c0f",
        });
      }
      miniWindowRef.current = popup;
      miniWindowOpRef.current = null;
      return popup;
    })().catch((error) => {
      miniWindowOpRef.current = null;
      throw error;
    });

    return miniWindowOpRef.current;
  }

  async function showMiniWindow() {
    if (miniVisibleRef.current) return;
    miniVisibleRef.current = true;
    try {
      const popup = await getMiniWindow();
      const position = await miniWindowPosition();
      await popup.setPosition(new PhysicalPosition(position.x, position.y));
      await popup.setResizable(true);
      await popup.setDecorations(true);
      await popup.setSize(new LogicalSize(MINI_WINDOW_WIDTH, MINI_WINDOW_HEIGHT));
      await popup.setAlwaysOnTop(true);
      await popup.show();
      await publishCurrentTimerState();
    } catch (error) {
      miniVisibleRef.current = false;
      throw error;
    }
  }

  async function hideMiniWindow() {
    miniVisibleRef.current = false;
    const popup = miniWindowRef.current || await WebviewWindow.getByLabel(MINI_WINDOW_LABEL);
    if (popup) {
      miniWindowRef.current = popup;
      await popup.hide();
    }
  }

  async function miniWindowPosition() {
    const monitor = await primaryMonitor();
    const workArea = monitor?.workArea;
    if (!workArea) return { x: 40, y: 40 };
    return {
      x: workArea.position.x + workArea.size.width - MINI_WINDOW_WIDTH - (MINI_WINDOW_MARGIN),
      y: workArea.position.y + MINI_WINDOW_TOP_MARGIN,
    };
  }

  function ensureCurrentDay() {
    const today = currentDateKey();
    if (today === dateKeyRef.current) return today;
    runningRef.current = false;
    setIsRunning(false);
    setNextCaptureAt(null);
    clearScheduledCapture();
    clearInterval(tickerRef.current);
    hideMiniWindow().catch(() => {});
    elapsedBeforeRunRef.current = 0;
    elapsedSecondsRef.current = 0;
    startedAtRef.current = null;
    dateKeyRef.current = today;
    sessionIdRef.current = "";
    clearPendingCaptureUploads();
    setElapsedSeconds(0);
    setDateKey(today);
    setStartedAt(null);
    setSessionId("");
    saveDailyTimerState(today, 0);
    return today;
  }

  function clearScheduledCapture() {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }

  function clearPendingCaptureUploads() {
    uploadTimersRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    uploadTimersRef.current.clear();
  }

  function getLiveElapsedSeconds(now = Date.now()) {
    if (!runningRef.current || !startedAtRef.current) {
      return elapsedSecondsRef.current;
    }

    const runSeconds = Math.floor((now - startedAtRef.current) / 1000);
    return Math.max(0, elapsedBeforeRunRef.current + runSeconds);
  }

  function setCommittedElapsed(seconds, activeDateKey = dateKeyRef.current) {
    const safeSeconds = Math.max(0, Math.floor(seconds || 0));
    elapsedSecondsRef.current = safeSeconds;
    setElapsedSeconds(safeSeconds);
    saveDailyTimerState(activeDateKey, safeSeconds);
    return safeSeconds;
  }

  function publishCurrentTimerState() {
    return publishTimerPayload(timerPayload({
      isRunning: runningRef.current,
      elapsedSeconds: getLiveElapsedSeconds(),
      dateKey: dateKeyRef.current,
    }));
  }

  function scheduleNextCapture(activeSessionId) {
    clearScheduledCapture();
    const delay = randomDelay(DEFAULT_MIN_DELAY_SECONDS, DEFAULT_MAX_DELAY_SECONDS);
    setNextCaptureAt(Date.now() + delay);
    timerRef.current = setTimeout(async () => {
      await captureForSession(activeSessionId);
      if (runningRef.current) scheduleNextCapture(activeSessionId);
    }, delay);
  }

  function scheduleCaptureUpload(capture) {
    const existingTimer = uploadTimersRef.current.get(capture.id);
    if (existingTimer) clearTimeout(existingTimer);

    const timeoutId = setTimeout(async () => {
      uploadTimersRef.current.delete(capture.id);
      try {
        const savedCapture = await storeCapture(capture, employeePin);
        setCaptures((current) =>
          current.map((item) =>
            item.id === capture.id
              ? {
                ...item,
                upload_status: "uploaded",
                analysis: savedCapture.analysis || null,
                analysis_error: savedCapture.analysis_error || "",
              }
              : item
          )
        );
      } catch (e) {
        setCaptures((current) =>
          current.map((item) =>
            item.id === capture.id
              ? { ...item, upload_status: "pending", upload_error: String(e) }
              : item
          )
        );
        setError(String(e));
      }
    }, CAPTURE_UPLOAD_DELAY_MS);

    uploadTimersRef.current.set(capture.id, timeoutId);
  }

  async function captureForSession(activeSessionId) {
    if (!runningRef.current) return;
    setIsCapturing(true);
    setError("");
    try {
      const capturedAt = new Date().toISOString();
      const shots = await callTauri("capture_all_screens");
      const payload = buildCapturePayload({ sessionId: activeSessionId, capturedAt, shots });
      const capture = {
        id: `${capturedAt}-${Math.random().toString(36).slice(2)}`,
        employee_pin: employeePin,
        analysis: null,
        analysis_error: "",
        ...payload,
      };
      setCaptures((current) => [
        capture,
        ...current,
      ].slice(0, MAX_CAPTURE_RECORDS));
      scheduleCaptureUpload(capture);
    } catch (e) {
      setError(String(e));
    } finally {
      setIsCapturing(false);
    }
  }

  function playSession() {
    if (runningRef.current) return;
    const today = ensureCurrentDay();
    const now = Date.now();
    const newSessionId = sessionId || `session-${new Date(now).toISOString()}`;
    elapsedBeforeRunRef.current = elapsedSecondsRef.current;
    startedAtRef.current = now;
    dateKeyRef.current = today;
    runningRef.current = true;
    sessionIdRef.current = newSessionId;
    setSessionId(newSessionId);
    setStartedAt(now);
    setError("");
    setIsRunning(true);
    storeTimerEvent({
      employeePin,
      sessionId: newSessionId,
      eventType: "start",
      eventAt: new Date(now).toISOString(),
      dateKey: today,
      elapsedSeconds: elapsedSecondsRef.current,
    }).catch((e) => setError(String(e)));
    clearInterval(tickerRef.current);
    tickerRef.current = setInterval(() => {
      const activeDateKey = currentDateKey();
      if (activeDateKey !== today) { ensureCurrentDay(); return; }
      setCommittedElapsed(getLiveElapsedSeconds(), today);
    }, 1000);
    publishCurrentTimerState().catch(() => {});
    scheduleNextCapture(newSessionId);
  }

  function pauseSession() {
    if (!runningRef.current) return;
    const nextElapsed = getLiveElapsedSeconds();
    elapsedBeforeRunRef.current = nextElapsed;
    startedAtRef.current = null;
    setCommittedElapsed(nextElapsed);
    runningRef.current = false;
    setIsRunning(false);
    setStartedAt(null);
    setNextCaptureAt(null);
    clearScheduledCapture();
    clearInterval(tickerRef.current);
    if (sessionIdRef.current) {
      storeTimerEvent({
        employeePin,
        sessionId: sessionIdRef.current,
        eventType: "stop",
        eventAt: new Date().toISOString(),
        dateKey: dateKeyRef.current,
        elapsedSeconds: nextElapsed,
      }).catch((e) => setError(String(e)));
    }
    publishTimerPayload(timerPayload({
      isRunning: false,
      elapsedSeconds: nextElapsed,
      dateKey: dateKeyRef.current,
    })).catch(() => {});
  }

  function openResetConfirm() {
    setError("");
    setResetConfirmOpen(true);
  }

  function cancelResetDay() {
    setResetConfirmOpen(false);
  }

  function hardResetDay() {
    setResetConfirmOpen(false);
    runningRef.current = false;
    setIsRunning(false);
    setNextCaptureAt(null);
    clearScheduledCapture();
    clearInterval(tickerRef.current);
    clearPendingCaptureUploads();
    elapsedBeforeRunRef.current = 0;
    elapsedSecondsRef.current = 0;
    startedAtRef.current = null;
    dateKeyRef.current = currentDateKey();
    setElapsedSeconds(0);
    setDateKey(dateKeyRef.current);
    setStartedAt(null);
    sessionIdRef.current = "";
    setSessionId("");
    setCaptures([]);
    setError("");
    saveDailyTimerState(dateKeyRef.current, 0);
    publishTimerPayload(timerPayload({
      isRunning: false,
      elapsedSeconds: 0,
      dateKey: dateKeyRef.current,
    })).catch(() => {});
    hideMiniWindow().catch(() => {});
  }

  const secondsUntilNextCapture = nextCaptureAt
    ? Math.max(0, Math.ceil((nextCaptureAt - Date.now()) / 1000))
    : null;

  const statusLabel = isRunning ? "Running" : elapsedSeconds > 0 ? "Paused" : "Ready";
  const statusClass = isRunning ? "running" : elapsedSeconds > 0 ? "paused" : "";

  // Format the timer with styled colons
  const timerStr = formatDuration(elapsedSeconds);
  const timerParts = timerStr.split(":");

  return (
    <div>
      {/* Header */}
      <header className="hw-header">
        <div className="hw-logo">
          <div className="hw-logo-mark">HW</div>
          <div>
            <div className="hw-logo-text">HybrideWatch</div>
            <div className="hw-logo-sub">Activity Monitor</div>
          </div>
        </div>
        <div className="hw-header-right">
          <div className={`hw-status-pill ${statusClass}`}>
            <span className="hw-status-dot" />
            {statusLabel}
          </div>
          <button
            type="button"
            className="hw-theme-btn"
            onClick={onToggleTheme}
            title="Toggle theme"
          >
            {theme === "dark" ? "\u2600" : "\u25D0"}
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="hw-content">

        {/* Timer Hero */}
        <div className="hw-timer-hero">
          <p className="hw-timer-label">Today's work time</p>
          <div className={`hw-timer-display ${isRunning ? "running" : ""}`}>
            {timerParts[0]}<span>:</span>{timerParts[1]}<span>:</span>{timerParts[2]}
          </div>
          <div className="hw-controls">
            <button
              type="button"
              onClick={playSession}
              disabled={isRunning}
              className="hw-btn hw-btn-primary"
            >
              <span className="hw-btn-icon">{"\u25B6"}</span>
              {elapsedSeconds > 0 ? "Resume" : "Start"}
            </button>
            <button
              type="button"
              onClick={pauseSession}
              disabled={!isRunning}
              className="hw-btn hw-btn-danger"
            >
              <span className="hw-btn-icon">{"\u23F8"}</span>
              Pause
            </button>
            <button
              type="button"
              onClick={openResetConfirm}
              className="hw-btn hw-btn-ghost"
            >
              <span className="hw-btn-icon">{"\u21BA"}</span>
              Reset day
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="hw-stats">
          <div className="hw-stat-card accent">
            <div className="hw-stat-value">
              {secondsUntilNextCapture === null ? "\u2014" : formatDurationWords(secondsUntilNextCapture)}
            </div>
            <div className="hw-stat-label">Next capture</div>
          </div>
          <div className="hw-stat-card green">
            <div className="hw-stat-value">{captures.length}</div>
            <div className="hw-stat-label">Local captures</div>
          </div>
          <div className="hw-stat-card blue">
            <div className="hw-stat-value">{pendingUploadCount}</div>
            <div className="hw-stat-label">Pending upload</div>
          </div>
        </div>

        {/* Meta */}
        <div className="hw-meta">
          <span className="hw-meta-item">
            <span className="hw-meta-key">employee</span> {employeePin}
          </span>
          <span className="hw-meta-item">
            <span className="hw-meta-key">date</span> {dateKey}
          </span>
          {sessionId && (
            <span className="hw-meta-item">
              <span className="hw-meta-key">session</span>
              {sessionId.replace("session-", "").slice(0, 24)}
            </span>
          )}
        </div>

        {/* Notices */}
        {isCapturing && (
          <div className="hw-notice info">
            <span>{"\u2B24"}</span> Capturing screenshot{"\u2026"}
          </div>
        )}
        {error && (
          <div className="hw-notice error">
            <span>{"\u26A0"}</span> {error}
          </div>
        )}
        {resetConfirmOpen && (
          <div className="hw-reset-confirm" role="alertdialog" aria-labelledby="reset-day-title">
            <div>
              <h2 id="reset-day-title" className="hw-reset-title">Reset today's timer?</h2>
              <p className="hw-reset-text">
                This will stop the timer, clear local captures, and set today's work time back to zero.
              </p>
            </div>
            <div className="hw-reset-actions">
              <button
                type="button"
                onClick={cancelResetDay}
                className="hw-btn hw-btn-ghost"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={hardResetDay}
                className="hw-btn hw-btn-danger"
              >
                Reset now
              </button>
            </div>
          </div>
        )}

        {/* Captures */}
        <div className="hw-section-header">
          <h2 className="hw-section-title">
            Captures
            <span className="hw-section-count">{captures.length}</span>
          </h2>
        </div>

        {captures.length === 0 ? (
          <div className="hw-empty-state">
            <span className="hw-empty-icon">{"\u{1F4F7}"}</span>
            <p className="hw-empty-text">No captures yet - start the timer to begin monitoring</p>
          </div>
        ) : (
          <div className="hw-capture-list">
            {captures.map((capture) => (
              <article key={capture.id} className="hw-capture-card">
                <div className="hw-capture-header">
                  <span className="hw-capture-time">
                    {new Date(capture.captured_at).toLocaleString()}
                  </span>
                  <div className="hw-capture-meta">
                    <span className="hw-meta-item">
                      {capture.images.length} image{capture.images.length !== 1 ? "s" : ""}
                    </span>
                    <span className={`hw-badge ${capture.upload_status}`}>
                      {capture.upload_status}
                    </span>
                  </div>
                </div>
                <div className="hw-capture-images">
                  {capture.images.map((image) => (
                    <figure
                      key={`${capture.id}-${image.index}`}
                      className="hw-capture-figure"
                    >
                      <img
                        src={image.data_url}
                        alt={image.monitor_name}
                        className="hw-capture-img"
                      />
                      <figcaption className="hw-capture-figcaption">
                        {image.monitor_name} {"\u00B7"} {image.width}{"\u00D7"}{image.height}
                      </figcaption>
                    </figure>
                  ))}
                </div>
                <div className="hw-analysis-panel">
                  <div className="hw-analysis-kicker">AI activity analysis</div>
                  {capture.analysis ? (
                    <div className="hw-analysis-grid">
                      <div className="hw-analysis-hero">
                        <div className="hw-analysis-activity">{capture.analysis.activity}</div>
                        <div className="hw-analysis-time">
                          PIN {capture.analysis.employee_pin} · {capture.analysis.time}
                        </div>
                      </div>
                      <div className="hw-analysis-pill-row">
                        <span className="hw-analysis-pill">{capture.analysis.apps || "Unknown app"}</span>
                        <span className="hw-analysis-pill subtle">{capture.capture_mode}</span>
                      </div>
                      <p className="hw-analysis-details">
                        {capture.analysis.details || "No extra details returned by the model."}
                      </p>
                    </div>
                  ) : capture.analysis_error ? (
                    <p className="hw-analysis-error">
                      Analysis unavailable: {capture.analysis_error}
                    </p>
                  ) : (
                    <p className="hw-analysis-pending">Analysis will appear after upload completes.</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


