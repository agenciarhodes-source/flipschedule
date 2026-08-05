"use client";

import { useEffect, useRef } from "react";

import { authClient } from "@/lib/auth/client";
import {
  SESSION_ACTIVITY_STORAGE_KEY,
  SESSION_IDLE_TIMEOUT_MS,
  SESSION_REFRESH_INTERVAL_MS,
} from "@/lib/auth/session-policy";

const ACTIVITY_WRITE_THROTTLE_MS = 15_000;
const SESSION_CHECK_INTERVAL_MS = 30_000;
const activityEvents = ["pointerdown", "keydown", "touchstart", "scroll"] as const;

function readLastActivity() {
  try {
    const value = window.localStorage.getItem(SESSION_ACTIVITY_STORAGE_KEY);
    if (!value) return null;
    const timestamp = Number(value);
    return Number.isFinite(timestamp) ? timestamp : null;
  } catch {
    return null;
  }
}

export function markSessionActivity(timestamp = Date.now()) {
  try {
    window.localStorage.setItem(SESSION_ACTIVITY_STORAGE_KEY, String(timestamp));
  } catch {
    // Private browsing or storage restrictions must not break authentication.
  }
}

export function SessionInactivityGuard() {
  const logoutStarted = useRef(false);

  useEffect(() => {
    let lastActivityWriteAt = 0;
    let lastServerRefreshAt = 0;

    async function closeSession(reason: "inactive" | "expired") {
      if (logoutStarted.current) return;
      logoutStarted.current = true;

      try {
        await authClient.signOut();
      } catch {
        // The redirect still clears access to protected UI when the API is unavailable.
      }

      window.location.replace(`/login?reason=${reason}`);
    }

    async function refreshServerSession() {
      const result = await authClient.getSession({
        query: { disableCookieCache: true },
      });

      if (result.error || !result.data) {
        await closeSession("expired");
      }
    }

    function recordActivity() {
      const now = Date.now();
      if (now - lastActivityWriteAt >= ACTIVITY_WRITE_THROTTLE_MS) {
        markSessionActivity(now);
        lastActivityWriteAt = now;
      }

      if (now - lastServerRefreshAt >= SESSION_REFRESH_INTERVAL_MS) {
        lastServerRefreshAt = now;
        void refreshServerSession();
      }
    }

    function evaluateSession() {
      const now = Date.now();
      const storedActivity = readLastActivity();

      if (storedActivity === null) {
        markSessionActivity(now);
        lastActivityWriteAt = now;
        lastServerRefreshAt = now;
        void refreshServerSession();
        return;
      }

      if (now - storedActivity >= SESSION_IDLE_TIMEOUT_MS) {
        void closeSession("inactive");
        return;
      }

      if (
        document.visibilityState === "visible" &&
        now - lastServerRefreshAt >= SESSION_REFRESH_INTERVAL_MS
      ) {
        lastServerRefreshAt = now;
        void refreshServerSession();
      }
    }

    for (const eventName of activityEvents) {
      window.addEventListener(eventName, recordActivity, { passive: true });
    }
    window.addEventListener("storage", evaluateSession);
    window.addEventListener("focus", evaluateSession);
    document.addEventListener("visibilitychange", evaluateSession);

    evaluateSession();
    const interval = window.setInterval(evaluateSession, SESSION_CHECK_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
      for (const eventName of activityEvents) {
        window.removeEventListener(eventName, recordActivity);
      }
      window.removeEventListener("storage", evaluateSession);
      window.removeEventListener("focus", evaluateSession);
      document.removeEventListener("visibilitychange", evaluateSession);
    };
  }, []);

  return null;
}
