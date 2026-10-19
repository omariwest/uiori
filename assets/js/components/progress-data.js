import { uiOriSupabase } from "../lib/supabase-client.js";

const FALLBACK_MILESTONES = [500, 1000, 1500, 2500, 5000, 10000];
let loading = false;
let loadedUserId = "";

function setText(selector, value) {
  document.querySelectorAll(selector).forEach((element) => {
    element.textContent = value;
  });
}

function formatMoney(cents) {
  const amount = Number.isFinite(Number(cents)) ? Number(cents) / 100 : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatPoints(value) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    Math.max(0, Number(value) || 0),
  );
}

function formatStreak(days) {
  const count = Math.max(0, Number(days) || 0);
  return `${count} ${count === 1 ? "day" : "days"}`;
}

function formatActivityDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function milestonePosition(balanceCents, milestones) {
  if (!milestones.length || balanceCents <= milestones[0]) return 0;
  if (balanceCents >= milestones[milestones.length - 1]) return 100;

  for (let index = 1; index < milestones.length; index += 1) {
    if (balanceCents <= milestones[index]) {
      const previous = milestones[index - 1];
      const next = milestones[index];
      const fraction = (balanceCents - previous) / Math.max(1, next - previous);
      return ((index - 1 + fraction) / (milestones.length - 1)) * 100;
    }
  }

  return 100;
}

function nextMilestone(balanceCents, milestones) {
  return milestones.find((value) => value > balanceCents) ?? milestones.at(-1) ?? 500;
}

function updateMilestonePath(balanceCents, milestones) {
  const line = document.querySelector(".dashboard-path-line > span");
  if (line) line.style.width = `${milestonePosition(balanceCents, milestones)}%`;

  const points = Array.from(document.querySelectorAll(".dashboard-path-points > span"));
  if (!points.length) return;

  const next = nextMilestone(balanceCents, milestones);
  points.forEach((point, index) => {
    const value = milestones[index];
    point.classList.remove("is-complete", "is-current", "is-next");
    if (!Number.isFinite(value)) return;
    if (value < balanceCents) point.classList.add("is-complete");
    else if (value === balanceCents) point.classList.add("is-current");
    else if (value === next) point.classList.add("is-next");
  });
}

function applyProgress(account, milestones, levels = []) {
  const balanceCents = Math.max(0, Number(account?.available_cents) || 0);
  const points = Math.max(0, Number(account?.contribution_points) || 0);
  const streak = Math.max(0, Number(account?.streak_days) || 0);
  const level = Math.max(1, Number(account?.level) || 1);
  const next = nextMilestone(balanceCents, milestones);

  setText("[data-uiori-balance]", formatMoney(balanceCents));
  setText("[data-uiori-next-milestone]", formatMoney(next));
  setText("[data-uiori-current-progress]", `${formatMoney(balanceCents)} current`);
  setText("[data-uiori-points]", formatPoints(points));
  setText("[data-uiori-streak]", formatStreak(streak));
  const levelRule = levels.find((item) => Number(item.level) === level);
  const levelLabel = levelRule?.label || "Starting level";

  setText("[data-uiori-level]", String(level));
  setText("[data-uiori-level-text]", `Level ${level}`);
  setText("[data-uiori-level-label]", levelLabel);

  updateMilestonePath(balanceCents, milestones);
}

function rewardEventView(event) {
  const points = Number(event?.points_delta) || 0;
  const cents = Number(event?.cents_delta) || 0;
  if (event?.event_type === "credit") {
    return { title: `${cents >= 0 ? "+" : ""}${formatMoney(cents)} credited`, copy: event.description || "Reward credited to your balance." };
  }
  if (event?.event_type === "withdrawal") {
    return { title: `${formatMoney(Math.abs(cents))} withdrawal`, copy: event.description || "Withdrawal activity recorded." };
  }
  if (event?.event_type === "adjustment") {
    return { title: "Account adjustment", copy: event.description || "A reward adjustment was recorded." };
  }
  if (event?.event_type === "points") {
    return { title: `+${formatPoints(points)} Contribution Points`, copy: event.description || "Eligible participation recorded." };
  }
  return { title: "Earning status updated", copy: event?.description || "Your earning connection changed." };
}

function withdrawalView(request) {
  const status = String(request?.status || "pending");
  const label = status[0].toUpperCase() + status.slice(1);
  const payout = request?.payout_asset && request?.payout_network
    ? `${request.payout_asset} · ${request.payout_network}`
    : "";

  let copy = `Withdrawal status: ${label}.`;
  if (status === "pending") {
    copy = "Your withdrawal request is waiting for review.";
  } else if (status === "approved") {
    copy = "Approved and queued for UIORI's monthly payout processing.";
  } else if (status === "paid") {
    copy = payout ? `Paid via ${payout}.` : "Payout completed.";
    if (request?.transaction_ref) {
      copy += ` Reference: ${request.transaction_ref}.`;
    }
  } else if (status === "rejected") {
    copy = "Request rejected. The reserved amount was returned to your balance.";
  } else if (status === "cancelled") {
    copy = "Request cancelled. The reserved amount was returned to your balance.";
  }

  return {
    title: `${formatMoney(request?.amount_cents)} withdrawal ${label.toLowerCase()}`,
    copy,
  };
}

function activityItemMarkup(item, classPrefix) {
  return `<li class="${classPrefix}-activity-item">
    <span class="${classPrefix}-activity-dot" aria-hidden="true"></span>
    <div class="${classPrefix}-activity-copy">
      <strong>${escapeHtml(item.title)}</strong>
      <p>${escapeHtml(item.copy)}</p>
    </div>
    <time>${escapeHtml(formatActivityDate(item.date))}</time>
  </li>`;
}

function renderDashboardActivity(events, withdrawals) {
  const container = document.querySelector(".dashboard-activity");
  if (!container) return;
  const items = [
    ...(events || []).filter((event) => event.event_type !== "withdrawal").map((event) => ({ ...rewardEventView(event), date: event.occurred_at || event.created_at })),
    ...(withdrawals || []).map((request) => ({
      ...withdrawalView(request),
      date: request.paid_at || request.reviewed_at || request.requested_at,
    })),
  ]
    .filter((item) => item.date)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 6);

  const old = container.querySelector(".dashboard-empty, .dashboard-activity-list");
  if (!items.length) return;
  const list = document.createElement("ul");
  list.className = "dashboard-activity-list";
  list.innerHTML = items.map((item) => activityItemMarkup(item, "dashboard")).join("");
  old?.replaceWith(list);
}

function renderWalletActivity(events, withdrawals) {
  const container = document.querySelector(".wallet-activity");
  if (!container) return;
  const walletEvents = (events || []).filter((event) =>
    ["credit", "adjustment"].includes(event.event_type),
  );
  const items = [
    ...walletEvents.map((event) => ({ ...rewardEventView(event), date: event.occurred_at || event.created_at })),
    ...(withdrawals || []).map((request) => ({
      ...withdrawalView(request),
      date: request.paid_at || request.reviewed_at || request.requested_at,
    })),
  ]
    .filter((item) => item.date)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 8);

  const old = container.querySelector(".wallet-empty, .wallet-activity-list");
  if (!items.length) return;
  const list = document.createElement("ul");
  list.className = "wallet-activity-list";
  list.innerHTML = items.map((item) => activityItemMarkup(item, "wallet")).join("");
  old?.replaceWith(list);
}

async function loadProgress() {
  if (loading || window.UIORIAccess?.state !== "active") return;
  loading = true;

  try {
    const {
      data: { user },
      error: userError,
    } = await uiOriSupabase.auth.getUser();
    if (userError || !user) throw userError || new Error("No authenticated user.");

    if (loadedUserId === user.id) return;

    const [accountResult, milestoneResult, levelResult, eventsResult, withdrawalsResult] = await Promise.all([
      uiOriSupabase
        .from("reward_accounts")
        .select(
          "available_cents, lifetime_credited_cents, contribution_points, streak_days, level, last_eligible_activity_date",
        )
        .eq("user_id", user.id)
        .single(),
      uiOriSupabase
        .from("reward_milestones")
        .select("amount_cents, sort_order, active")
        .eq("active", true)
        .order("sort_order", { ascending: true }),
      uiOriSupabase
        .from("progress_levels")
        .select("level, min_points, label, active")
        .eq("active", true)
        .order("level", { ascending: true }),
      uiOriSupabase
        .from("reward_events")
        .select("id,event_type,points_delta,cents_delta,description,source,occurred_at,created_at")
        .eq("user_id", user.id)
        .order("occurred_at", { ascending: false })
        .limit(12),
      uiOriSupabase
        .from("withdrawal_requests")
        .select("id,amount_cents,status,requested_at,reviewed_at,paid_at,transaction_ref,payout_asset,payout_network")
        .eq("user_id", user.id)
        .order("requested_at", { ascending: false })
        .limit(12),
    ]);

    if (accountResult.error) throw accountResult.error;

    const milestones = milestoneResult.error
      ? FALLBACK_MILESTONES
      : (milestoneResult.data || [])
          .map((row) => Number(row.amount_cents))
          .filter((value) => Number.isFinite(value) && value > 0);

    const levels = levelResult.error ? [] : levelResult.data || [];
    const events = eventsResult.error ? [] : eventsResult.data || [];
    const withdrawals = withdrawalsResult.error ? [] : withdrawalsResult.data || [];

    applyProgress(
      accountResult.data,
      milestones.length ? milestones : FALLBACK_MILESTONES,
      levels,
    );
    renderDashboardActivity(events, withdrawals);
    renderWalletActivity(events, withdrawals);
    loadedUserId = user.id;

    document.dispatchEvent(
      new CustomEvent("uiori:progress-loaded", {
        detail: { account: accountResult.data, milestones, levels, events, withdrawals },
      }),
    );
  } catch (error) {
    console.error("[UIORI] progress load failed", error);
  } finally {
    loading = false;
  }
}

document.addEventListener("uiori:account-state", (event) => {
  if (event.detail?.state === "active") {
    loadedUserId = "";
    window.setTimeout(loadProgress, 0);
  } else {
    loadedUserId = "";
  }
});

window.UIORIProgress = {
  refresh() {
    loadedUserId = "";
    return loadProgress();
  },
};

document.addEventListener("DOMContentLoaded", () => {
  window.setTimeout(loadProgress, 0);
});
