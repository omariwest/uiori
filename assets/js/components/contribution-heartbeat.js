import { uiOriSupabase } from "../lib/supabase-client.js";
import {
  hasObservedMellowtelWork,
  isMobileDevice,
  verifyMellowtelPresence,
} from "../lib/mellowtel-verification.js";

const HEARTBEAT_INTERVAL_MS = 10 * 60 * 1000;

let running = false;
let inFlight = false;
let timerId = 0;
let lastAttemptAt = 0;
let suspendedUntil = 0;
let verificationMissing = false;
let latestAccountDetail = null;
let resumeInFlight = false;

function clearTimer() {
  if (timerId) window.clearInterval(timerId);
  timerId = 0;
}

function isEligibleAccount(detail = {}) {
  return (
    detail.state === "active" &&
    detail.identity?.connectionStatus === "active" &&
    detail.identity?.restrictionStatus === "clear"
  );
}

function isRecoverablePausedAccount(detail = {}) {
  return (
    detail.state === "active" &&
    detail.identity?.connectionStatus === "paused" &&
    detail.identity?.restrictionStatus === "clear"
  );
}

async function resumePausedAccount(detail = {}) {
  if (isMobileDevice()) return;
  if (!isRecoverablePausedAccount(detail) || resumeInFlight) return;

  resumeInFlight = true;
  try {
    const extensionPresent = await verifyMellowtelPresence();

    if (!extensionPresent) {
      document.dispatchEvent(new CustomEvent("uiori:verification-required"));
      return;
    }

    if (!hasObservedMellowtelWork()) return;

    const { data, error } = await uiOriSupabase.functions.invoke(
      "earning-activation",
      {
        body: {
          action: "resume",
          extension_present: true,
          active_work_observed: true,
        },
      },
    );

    if (error || !data?.ok) {
      throw error || new Error(data?.error || "resume_error");
    }

    await window.UIORIAccess?.refresh?.();
  } catch (error) {
    console.warn("[UIORI] earning recovery skipped", error);
  } finally {
    resumeInFlight = false;
  }
}

function nextUtcDay() {
  const now = new Date();
  return Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
  );
}

async function sendHeartbeat() {
  if (!running || inFlight) return;

  const now = Date.now();
  if (now < suspendedUntil) return;
  if (lastAttemptAt && now - lastAttemptAt < HEARTBEAT_INTERVAL_MS - 5000) return;

  inFlight = true;
  lastAttemptAt = now;

  try {
    const extensionPresent = await verifyMellowtelPresence();
    const { data, error } = await uiOriSupabase.functions.invoke(
      "earning-activation",
      {
        body: {
          action: "heartbeat",
          extension_present: extensionPresent,
          active_work_observed:
            extensionPresent && hasObservedMellowtelWork(),
        },
      },
    );

    if (error || !data?.ok) {
      throw error || new Error(data?.error || "heartbeat_error");
    }

    const heartbeat = data.heartbeat || {};

    if (heartbeat.reason === "unsupported_device") {
      running = false;
      clearTimer();
      return;
    }

    if (heartbeat.reason === "daily_limit") {
      suspendedUntil = nextUtcDay();
      return;
    }

    if (heartbeat.reason === "earning_not_active" || heartbeat.reason === "account_restricted") {
      running = false;
      clearTimer();
      return;
    }

    if (heartbeat.reason === "verification_required") {
      verificationMissing = true;
      document.dispatchEvent(new CustomEvent("uiori:verification-required"));
      return;
    }

    if (heartbeat.accepted === true) {
      if (verificationMissing) {
        verificationMissing = false;
        window.UIORIAccess?.refresh?.();
      }
      document.dispatchEvent(
        new CustomEvent("uiori:heartbeat-recorded", { detail: heartbeat }),
      );
      window.UIORIProgress?.refresh?.();
    }
  } catch (error) {
    console.warn("[UIORI] contribution heartbeat skipped", error);
  } finally {
    inFlight = false;
  }
}

function startHeartbeat(detail = {}) {
  latestAccountDetail = detail;

  if (isMobileDevice()) {
    running = false;
    clearTimer();
    return;
  }

  const eligible = isEligibleAccount(detail);

  if (!eligible) {
    running = false;
    clearTimer();
    if (isRecoverablePausedAccount(detail)) {
      window.setTimeout(() => resumePausedAccount(detail), 0);
    }
    return;
  }

  running = true;
  clearTimer();
  window.setTimeout(sendHeartbeat, 0);
  timerId = window.setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
}

document.addEventListener("uiori:account-state", (event) => {
  startHeartbeat(event.detail || {});
});

document.addEventListener("uiori:mellowtel-active-work", () => {
  if (latestAccountDetail) {
    window.setTimeout(() => resumePausedAccount(latestAccountDetail), 0);
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  if (isRecoverablePausedAccount(latestAccountDetail || {})) {
    window.setTimeout(() => resumePausedAccount(latestAccountDetail), 0);
  } else {
    window.setTimeout(sendHeartbeat, 0);
  }
});

document.addEventListener("DOMContentLoaded", () => {
  if (window.UIORIAccess?.state === "active") {
    window.setTimeout(() => window.UIORIAccess?.refresh?.(), 0);
  }
});
