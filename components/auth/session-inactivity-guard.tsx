"use client";

import { PropsWithChildren, useEffect, useRef, useState } from "react";

import { authClient } from "@/lib/auth/client";
import {
  SESSION_IDLE_TIMEOUT_MS,
  SESSION_REFRESH_INTERVAL_MS,
} from "@/lib/auth/session-policy";
import {
  clearTabSession,
  markTabSessionActivity,
  readTabSessionActivity,
} from "@/lib/auth/tab-session";

const ACTIVITY_WRITE_THROTTLE_MS = 15_000;
const SESSION_CHECK_INTERVAL_MS = 30_000;
const activityEvents = ["pointerdown", "keydown", "touchstart", "scroll"] as const;

export function SessionInactivityGuard({ children }: PropsWithChildren) {
  const [isValidated, setIsValidated] = useState(false);
  const logoutStarted = useRef(false);

  useEffect(() => {
    let disposed = false;
    let interval: number | undefined;
    let listenersAttached = false;
    let lastActivityWriteAt = 0;
    let lastServerRefreshAt = 0;

    function redirectToLogin(reason: "tab" | "inactive" | "expired") {
      if (logoutStarted.current) return;
      logoutStarted.current = true;
      clearTabSession();
      window.location.replace(`/login?reason=${reason}`);
    }

    async function closeServerSession(reason: "inactive" | "expired") {
      if (logoutStarted.current) return;
      logoutStarted.current = true;
      clearTabSession();

      try {
        await authClient.signOut();
      } catch {
        // The redirect still removes access to protected UI if sign-out is unavailable.
      }

      window.location.replace(`/login?reason=${reason}`);
    }

    async function refreshServerSession() {
      const result = await authClient.getSession({
        query: { disableCookieCache: true },
      });

      if (result.error || !result.data) {
        await closeServerSession("expired");
        return false;
      }

      return true;
    }

    function evaluateTabSession() {
      const storedActivity = readTabSessionActivity();
      if (storedActivity === null) {
        redirectToLogin("tab");
        return false;
      }

      if (Date.now() - storedActivity >= SESSION_IDLE_TIMEOUT_MS) {
        void closeServerSession("inactive");
        return false;
      }

      return true;
    }

    function recordActivity() {
      if (!evaluateTabSession()) return;

      const now = Date.now();
      if (now - lastActivityWriteAt >= ACTIVITY_WRITE_THROTTLE_MS) {
        markTabSessionActivity(now);
        lastActivityWriteAt = now;
      }

      if (now - lastServerRefreshAt >= SESSION_REFRESH_INTERVAL_MS) {
        lastServerRefreshAt = now;
        void refreshServerSession();
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        recordActivity();
      } else {
        evaluateTabSession();
      }
    }

    function attachListeners() {
      if (listenersAttached) return;
      listenersAttached = true;

      for (const eventName of activityEvents) {
        window.addEventListener(eventName, recordActivity, { passive: true });
      }
      window.addEventListener("focus", recordActivity);
      document.addEventListener("visibilitychange", handleVisibilityChange);
      interval = window.setInterval(evaluateTabSession, SESSION_CHECK_INTERVAL_MS);
    }

    async function initialize() {
      if (!evaluateTabSession()) return;

      const hasServerSession = await refreshServerSession();
      if (!hasServerSession || disposed) return;

      const now = Date.now();
      lastActivityWriteAt = now;
      lastServerRefreshAt = now;
      setIsValidated(true);
      attachListeners();
    }

    void initialize();

    return () => {
      disposed = true;
      if (interval !== undefined) window.clearInterval(interval);
      if (!listenersAttached) return;

      for (const eventName of activityEvents) {
        window.removeEventListener(eventName, recordActivity);
      }
      window.removeEventListener("focus", recordActivity);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  if (!isValidated) return null;
  return children;
}
