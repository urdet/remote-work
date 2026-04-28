import { invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";

export function isTauriRuntime() {
  return typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);
}

export function callTauri(command, args) {
  if (!isTauriRuntime()) {
    throw new Error("Tauri APIs are unavailable. Start the app with npm run tauri dev.");
  }
  return invoke(command, args);
}

export async function emitTimerState(payload) {
  if (isTauriRuntime()) await emit("timer-state", payload);
}

export async function emitTimerAction(action) {
  if (isTauriRuntime()) await emit("timer-action", action);
}
