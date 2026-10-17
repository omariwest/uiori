import { getProfileAvatarUrl, uiOriSupabase } from "../lib/supabase-client.js";
import { setMemberState, setupProfilePhotoUpload } from "./account-identity.js";

const VALID_STATES = new Set(["anonymous", "inactive", "active"]);
let currentState = "pending";
let resolving = false;

function setText(selector, value) {
  document.querySelectorAll(selector).forEach((element) => {
    element.textContent = value;
  });
}

function setActionDisabled(disabled) {
  document.querySelectorAll("[data-uiori-active-action]").forEach((element) => {
    if (element.dataset.uioriOriginalDisabled === undefined && "disabled" in element) {
      element.dataset.uioriOriginalDisabled = String(element.disabled);
    }

    if ("disabled" in element) {
      const wasDisabled = element.dataset.uioriOriginalDisabled === "true";
      element.disabled = disabled ? true : wasDisabled;
    }

    element.setAttribute(
      "aria-disabled",
      String(disabled || element.dataset.uioriOriginalDisabled === "true"),
    );
  });
}

function toggleInactiveMessage(show) {
  document.querySelectorAll("[data-uiori-inactive-message]").forEach((element) => {
    element.hidden = !show;
  });
}

function applyConnectionState(status, accountState) {
  const normalized = new Set(["not_connected", "pending", "active", "paused"]).has(status)
    ? status
    : "not_connected";

  const labels = {
    not_connected: "Not connected",
    pending: "Setup pending",
    active: "Active",
    paused: "Paused",
  };

  const label = labels[normalized];
  setText("[data-uiori-earning-status]", label);
  setText("[data-uiori-earning-settings-status]", label);

  if (accountState === "inactive") {
    if (normalized === "pending") {
      setText(
        "[data-uiori-dashboard-note]",
        "Your earning setup is pending. Progress stays locked until activation completes.",
      );
      setText(
        "[data-uiori-earn-status-copy]",
        "Your setup is pending. Earning starts only after the connection is activated.",
      );
      setText("[data-uiori-ready-title]", "Setup pending");
      setText(
        "[data-uiori-ready-copy]",
        "UIORI will unlock earning after the connection is successfully activated.",
      );
    } else {
      setText(
        "[data-uiori-dashboard-note]",
        "Your account is visible, but earning stays locked until activation.",
      );
      setText(
        "[data-uiori-earn-status-copy]",
        "Complete the earning setup before eligible progress can start. Nothing starts automatically.",
      );
    }
  } else if (accountState === "active") {
    if (normalized === "paused") {
      setText(
        "[data-uiori-dashboard-note]",
        "Your account is active. Earning is currently paused, while existing progress remains visible.",
      );
    } else {
      setText(
        "[data-uiori-dashboard-note]",
        "Your balance and progress update as eligible activity is recorded.",
      );
    }
  }
}

function setInactiveMilestonePath() {
  const line = document.querySelector(".dashboard-path-line > span");
  if (line) {
    if (line.dataset.uioriOriginalWidth === undefined) {
      line.dataset.uioriOriginalWidth = line.style.width || "";
    }
    line.style.width = "0";
  }

  const points = Array.from(document.querySelectorAll(".dashboard-path-points > span"));
  points.forEach((point) => {
    if (point.dataset.uioriOriginalClass === undefined) {
      point.dataset.uioriOriginalClass = point.className;
    }
    point.classList.remove("is-complete", "is-current", "is-next");
  });
  points[0]?.classList.add("is-next");
}

function restoreMilestonePath() {
  const line = document.querySelector(".dashboard-path-line > span");
  if (line?.dataset.uioriOriginalWidth !== undefined) {
    line.style.width = line.dataset.uioriOriginalWidth;
  }

  document.querySelectorAll(".dashboard-path-points > span").forEach((point) => {
    if (point.dataset.uioriOriginalClass !== undefined) {
      point.className = point.dataset.uioriOriginalClass;
    }
  });
}

function applyInactiveValues() {
  toggleInactiveMessage(true);
  setText("[data-uiori-balance]", "$0.00");
  setText("[data-uiori-next-milestone]", "$5.00");
  setText("[data-uiori-current-progress]", "$0 current");
  setText("[data-uiori-points]", "0");
  setText("[data-uiori-streak]", "0 days");
  setText("[data-uiori-level]", "1");
  setText("[data-uiori-level-text]", "Level 1");
  setText("[data-uiori-level-label]", "Not active");
  setText("[data-uiori-earning-status]", "Inactive");
  setText("[data-uiori-withdrawal-status]", "Locked until activation");
  setText("[data-uiori-earning-settings-status]", "Inactive");
  setText("[data-uiori-account-status]", "Inactive");
  setText("[data-uiori-email-status]", "Pending verification");
  setText(
    "[data-uiori-dashboard-note]",
    "Your account is visible, but earning stays locked until activation.",
  );
  setText(
    "[data-uiori-wallet-note]",
    "Your wallet is visible, but earning and withdrawals stay locked until your account is activated.",
  );
  setText(
    "[data-uiori-earn-status-copy]",
    "Your account is created, but earning stays locked until activation.",
  );
  setInactiveMilestonePath();
  setText("[data-uiori-ready-title]", "Activate your account first");
  setText(
    "[data-uiori-ready-copy]",
    "Complete account activation before earning can start. Nothing starts automatically.",
  );
  document.querySelectorAll("[data-uiori-ready-link]").forEach((link) => {
    link.textContent = "Account settings";
    link.href = "/settings/";
  });
  setActionDisabled(true);
}

function applyActiveState() {
  toggleInactiveMessage(false);
  restoreMilestonePath();
  setText("[data-uiori-account-status]", "Active");
  setText("[data-uiori-email-status]", "Verified");
  setActionDisabled(false);
}

function applyReviewOverlay(restrictionStatus, accountState, identity = {}) {
  const normalized = new Set(["clear", "review", "restricted"]).has(restrictionStatus)
    ? restrictionStatus
    : "clear";

  if (normalized === "clear") return;

  if (normalized === "review") {
    setText("[data-uiori-account-status]", "Under review");
    setText("[data-uiori-withdrawal-status]", "Review required");
    setText(
      "[data-uiori-wallet-note]",
      "An account review is open. Your credited balance remains visible, but withdrawals stay unavailable until the review is cleared.",
    );
    if (accountState === "active") {
      setText(
        "[data-uiori-dashboard-note]",
        "An account review is open. Earning can continue unless UIORI restricts the account, while withdrawals remain paused.",
      );
    }
    return;
  }

  setMemberState({
    name: identity.name,
    avatarUrl: identity.avatarUrl,
    state: "restricted",
  });
  setActionDisabled(true);
  setText("[data-uiori-account-status]", "Restricted");
  setText("[data-uiori-earning-status]", "Paused for review");
  setText("[data-uiori-earning-settings-status]", "Paused for review");
  setText("[data-uiori-withdrawal-status]", "Unavailable during review");
  setText("[data-uiori-level-label]", "Account review");
  setText(
    "[data-uiori-dashboard-note]",
    "Your account is under review. Existing balance and progress remain visible, but earning and withdrawals are temporarily unavailable.",
  );
  setText(
    "[data-uiori-wallet-note]",
    "Your credited balance remains visible, but withdrawals are unavailable while this account review is in progress.",
  );
  setText(
    "[data-uiori-earn-status-copy]",
    "Earning is paused while UIORI reviews the account. Existing credited rewards are not removed by this status.",
  );
  setText("[data-uiori-ready-title]", "Account review in progress");
  setText(
    "[data-uiori-ready-copy]",
    "Earning stays paused until the review is cleared. Contact UIORI Support if you need help.",
  );
  document.querySelectorAll("[data-uiori-ready-link]").forEach((link) => {
    link.textContent = "Contact support";
    link.href = "/contact/";
  });
}

function reveal() {
  document.body?.classList.remove("app-auth-loading");
}

function redirectAnonymous() {
  const next = `${window.location.pathname}${window.location.search}`;
  const loginUrl = new URL("/login/", window.location.origin);
  if (next && !next.startsWith("/login")) loginUrl.searchParams.set("next", next);
  window.location.replace(loginUrl.toString());
}

function safeName(user, profile) {
  return (
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "UIORI member"
  );
}

export function setAccountAccessState(state, identity = {}) {
  const normalized = VALID_STATES.has(state) ? state : "anonymous";
  currentState = normalized;
  document.documentElement.dataset.uioriAccountState = normalized;

  if (normalized === "anonymous") {
    setMemberState({ state: "pending" });
    redirectAnonymous();
    return;
  }

  setMemberState({
    name: identity.name,
    avatarUrl: identity.avatarUrl,
    state: identity.restrictionStatus === "restricted" ? "restricted" : normalized,
  });

  if (normalized === "inactive") applyInactiveValues();
  else applyActiveState();

  applyConnectionState(identity.connectionStatus, normalized);
  applyReviewOverlay(identity.restrictionStatus, normalized, identity);

  if (identity.emailVerified === true) setText("[data-uiori-email-status]", "Verified");
  else if (identity.emailVerified === false) setText("[data-uiori-email-status]", "Pending verification");

  reveal();
  document.dispatchEvent(
    new CustomEvent("uiori:account-state", {
      detail: { state: normalized, identity },
    }),
  );
}

async function loadAccountState() {
  if (resolving) return;
  resolving = true;

  try {
    const {
      data: { user },
      error: userError,
    } = await uiOriSupabase.auth.getUser();

    if (userError || !user) {
      setAccountAccessState("anonymous");
      return;
    }
    const [profileResult, connectionResult] = await Promise.all([
      uiOriSupabase
        .from("profiles")
        .select("full_name, avatar_path, activation_status, restriction_status, created_at")
        .eq("id", user.id)
        .single(),
      uiOriSupabase
        .from("earning_connections")
        .select("status, activated_at, paused_at, last_eligible_activity_at")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    if (profileResult.error) {
      console.error("[UIORI] profile load failed", profileResult.error);
      throw profileResult.error;
    }

    if (connectionResult.error) {
      console.error("[UIORI] earning connection load failed", connectionResult.error);
    }

    const profile = profileResult.data;
    const connection = connectionResult.data;
    const state = profile.activation_status === "active" ? "active" : "inactive";
    const avatarUrl = profile.avatar_path ? await getProfileAvatarUrl(profile.avatar_path) : "";

    setAccountAccessState(state, {
      user,
      profile,
      connection,
      connectionStatus: connection?.status || "not_connected",
      restrictionStatus: profile.restriction_status || "clear",
      name: safeName(user, profile),
      avatarUrl,
      email: user.email || "",
      emailVerified: Boolean(user.email_confirmed_at),
      memberSince: profile.created_at || user.created_at || "",
    });
  } catch (error) {
    console.error("[UIORI] account resolution failed", error);
    setAccountAccessState("anonymous");
  } finally {
    resolving = false;
  }
}

function wireLogout() {
  document.querySelectorAll("[data-uiori-logout]").forEach((control) => {
    if (control.dataset.uioriLogoutReady === "true") return;
    control.dataset.uioriLogoutReady = "true";
    control.addEventListener("click", async (event) => {
      event.preventDefault();
      control.setAttribute("aria-disabled", "true");
      try {
        await uiOriSupabase.auth.signOut();
      } finally {
        window.location.replace("/login/");
      }
    });
  });
}

window.UIORIAccess = {
  get state() {
    return currentState;
  },
  setState: setAccountAccessState,
  refresh: loadAccountState,
};

document.addEventListener("DOMContentLoaded", () => {
  setMemberState({ state: "pending" });
  setupProfilePhotoUpload();
  wireLogout();
  loadAccountState();
});

uiOriSupabase.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_OUT") {
    setAccountAccessState("anonymous");
  } else if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "TOKEN_REFRESHED") {
    window.setTimeout(loadAccountState, 0);
  }
});
