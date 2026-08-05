import { SESSION_ACTIVITY_STORAGE_KEY } from "./session-policy";

export function readTabSessionActivity() {
  try {
    const value = window.sessionStorage.getItem(SESSION_ACTIVITY_STORAGE_KEY);
    if (!value) return null;

    const timestamp = Number(value);
    return Number.isFinite(timestamp) ? timestamp : null;
  } catch {
    return null;
  }
}

export function markTabSessionActivity(timestamp = Date.now()) {
  try {
    window.sessionStorage.setItem(SESSION_ACTIVITY_STORAGE_KEY, String(timestamp));
  } catch {
    // Storage restrictions must not crash the application.
  }
}

export function clearTabSession() {
  try {
    window.sessionStorage.removeItem(SESSION_ACTIVITY_STORAGE_KEY);
  } catch {
    // Storage restrictions must not crash the application.
  }
}
