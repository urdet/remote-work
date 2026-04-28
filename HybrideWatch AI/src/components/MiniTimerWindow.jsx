import { useEffect, useMemo, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { emitTimerAction } from "../api/tauri";
import { formatDuration, loadDailyTimerState } from "../utils/timer";

export default function MiniTimerWindow() {
  const initialDailyState = useMemo(() => loadDailyTimerState(), []);
  const [miniState, setMiniState] = useState({
    isRunning: true,
    elapsedSeconds: initialDailyState.elapsedSeconds,
    dateKey: initialDailyState.dateKey,
    updatedAt: Date.now(),
    hasLiveState: false,
  });
  const [displaySeconds, setDisplaySeconds] = useState(initialDailyState.elapsedSeconds);

  useEffect(() => {
    document.body.classList.add("hw-mini-window");
    return () => document.body.classList.remove("hw-mini-window");
  }, []);

  useEffect(() => {
    let unlistenTimerState = null;
    async function setup() {
      unlistenTimerState = await listen("timer-state", (event) => {
        setMiniState({ ...event.payload, hasLiveState: true });
      });
      await emitTimerAction("request-state");
    }
    setup().catch(console.error);
    return () => { if (unlistenTimerState) unlistenTimerState(); };
  }, []);

  useEffect(() => {
    function update() {
      if (!miniState.hasLiveState) { setDisplaySeconds(miniState.elapsedSeconds); return; }
      const delta = miniState.isRunning ? Math.floor((Date.now() - miniState.updatedAt) / 1000) : 0;
      setDisplaySeconds(miniState.elapsedSeconds + delta);
    }
    update();
    const id = setInterval(update, 250);
    return () => clearInterval(id);
  }, [miniState]);

  function startMiniDrag(e) {
    if (e.button !== 0) return;
    getCurrentWindow().startDragging().catch(() => {});
  }

  return (
    <div className="hw-mini" data-theme="dark">
      <div className="hw-mini-drag" onMouseDown={startMiniDrag}>
        <span className="hw-mini-drag-dot" />
        <span className="hw-mini-drag-dot" />
        <span className="hw-mini-drag-dot" />
        <span className="hw-mini-drag-dot" />
        <span className="hw-mini-drag-dot" />
      </div>
      <div className="hw-mini-body">
        <div>
          <p className="hw-mini-label">HybrideWatch AI</p>
          <p className="hw-mini-time">
            {miniState.hasLiveState ? formatDuration(displaySeconds) : "--:--:--"}
          </p>
          <p className="hw-mini-status">
            {miniState.isRunning ? "\u25CF Running" : "\u25CB Paused"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => emitTimerAction(miniState.isRunning ? "pause" : "resume")}
          className={`hw-mini-btn ${miniState.isRunning ? "pause" : "resume"}`}
        >
          {miniState.isRunning ? "Pause" : "Resume"}
        </button>
      </div>
    </div>
  );
}


