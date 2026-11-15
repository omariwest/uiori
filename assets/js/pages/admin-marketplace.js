import "./admin-auth.js";
import "../components/app-navigation.js";
import { uiOriAdminSupabase } from "../lib/supabase-client.js";

function integer(value) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Number(value) || 0);
}

function money(value, asset = "USD") {
  const amount = Number(value) || 0;
  if (asset === "USDT") return `${amount.toFixed(2)} USDT`;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function shortDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
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

function statusLabel(value) {
  const map = {
    draft: "Draft",
    active: "Active",
    paused: "Paused",
    archived: "Archived",
    review: "In review",
    funded: "Funded",
    scheduled: "Scheduled",
    live: "Live",
    completed: "Completed",
    cancelled: "Cancelled",
    refunded: "Refunded",
    pending: "Pending",
    confirming: "Confirming",
    confirmed: "Confirmed",
    failed: "Failed",
    refunding: "Refunding",
  };
  return map[value] || value || "—";
}

function statusMarkup(value) {
  return `<span class="market-admin-status is-${escapeHtml(value || "unknown")}"><i></i>${escapeHtml(statusLabel(value))}</span>`;
}

function setText(selector, value) {
  document.querySelectorAll(selector).forEach((el) => {
    el.textContent = String(value);
  });
}

function showError(message) {
  const topbar = document.querySelector(".admin-topbar");
  if (!topbar || document.querySelector(".market-admin-error")) return;
  const box = document.createElement("p");
  box.className = "market-admin-error";
  box.setAttribute("role", "alert");
  box.textContent = message;
  topbar.insertAdjacentElement("afterend", box);
}

async function fetchScope(scope) {
  const { data, error } = await uiOriAdminSupabase.functions.invoke("admin-marketplace-data", {
    body: { scope },
  });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || "marketplace_admin_unavailable");
  return data;
}

function renderOverview(data) {
  const summary = data.summary || {};
  const values = [
    integer(summary.channels_active),
    integer(summary.campaigns_total),
    integer(summary.campaigns_review),
    integer(summary.advertisers),
    money(summary.confirmed_volume, "USDT"),
  ];
  document.querySelectorAll(".admin-metrics .admin-metric strong").forEach((el, index) => {
    if (values[index] !== undefined) el.textContent = values[index];
  });

  const queue = document.querySelector("[data-market-admin-review-queue]");
  if (queue) {
    queue.textContent = summary.campaigns_review
      ? `${integer(summary.campaigns_review)} campaign${Number(summary.campaigns_review) === 1 ? "" : "s"} waiting for review`
      : "No campaigns waiting for review";
  }

  const recent = document.querySelector("[data-market-admin-recent]");
  const rows = data.recent_campaigns || [];
  if (recent) {
    recent.innerHTML = rows.length
      ? rows.map((row) => `
          <div class="market-admin-recent-row">
            <div><strong>${escapeHtml(row.title || "Untitled campaign")}</strong><span>${escapeHtml(row.advertiser?.email || "Unknown advertiser")}</span></div>
            ${statusMarkup(row.status)}
          </div>`).join("")
      : `<div class="market-admin-empty">No marketplace campaigns yet.</div>`;
  }
}

function renderChannels(data) {
  const rows = data.channels || [];
  setText("[data-market-admin-count]", `${integer(rows.length)} record${rows.length === 1 ? "" : "s"}`);
  const tbody = document.querySelector("[data-market-admin-table-body]");
  if (!tbody) return;
  tbody.innerHTML = rows.length
    ? rows.map((row) => `<tr>
        <th scope="row"><strong>${escapeHtml(row.display_name)}</strong><span>${row.telegram_handle ? "@" + escapeHtml(row.telegram_handle) : "No public handle"}</span></th>
        <td>${escapeHtml(row.category)}</td>
        <td>${escapeHtml(row.region)}</td>
        <td>${escapeHtml(row.language)}</td>
        <td>${statusMarkup(row.status)}</td>
        <td>${escapeHtml(shortDate(row.verified_at || row.created_at))}</td>
      </tr>`).join("")
    : `<tr><td colspan="6" class="admin-table-empty">No marketplace channels have been added yet.</td></tr>`;
}

function renderCampaigns(data, moderationOnly = false) {
  const rows = data.campaigns || [];
  setText("[data-market-admin-count]", `${integer(rows.length)} record${rows.length === 1 ? "" : "s"}`);
  const tbody = document.querySelector("[data-market-admin-table-body]");
  if (!tbody) return;

  if (moderationOnly) {
    tbody.innerHTML = rows.length
      ? rows.map((row) => `<tr>
          <th scope="row"><strong>${escapeHtml(row.title || "Untitled campaign")}</strong><span>${escapeHtml(row.advertiser?.email || "Unknown advertiser")}</span></th>
          <td class="market-admin-copy-cell">${escapeHtml(row.creative?.text || "—")}</td>
          <td class="market-admin-copy-cell">${escapeHtml(row.destination || "—")}</td>
          <td>${integer(row.channel_count)}</td>
          <td>${escapeHtml(shortDate(row.created_at))}</td>
        </tr>`).join("")
      : `<tr><td colspan="5" class="admin-table-empty">No campaigns are waiting for moderation.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.length
    ? rows.map((row) => `<tr>
        <th scope="row"><strong>${escapeHtml(row.title || "Untitled campaign")}</strong><span>${escapeHtml(row.advertiser?.email || "Unknown advertiser")}</span></th>
        <td>${integer(row.channel_count)}</td>
        <td>${statusMarkup(row.status)}</td>
        <td>${row.total_amount_cents ? money(Number(row.total_amount_cents) / 100) : "$0.00"}</td>
        <td>${escapeHtml(shortDate(row.created_at))}</td>
      </tr>`).join("")
    : `<tr><td colspan="5" class="admin-table-empty">No marketplace campaigns yet.</td></tr>`;
}

function renderAdvertisers(data) {
  const rows = data.advertisers || [];
  setText("[data-market-admin-count]", `${integer(rows.length)} record${rows.length === 1 ? "" : "s"}`);
  const tbody = document.querySelector("[data-market-admin-table-body]");
  if (!tbody) return;
  tbody.innerHTML = rows.length
    ? rows.map((row) => `<tr>
        <th scope="row"><strong>${escapeHtml(row.name || "Advertiser")}</strong><span>${escapeHtml(row.email || "—")}</span></th>
        <td>${integer(row.campaign_count)}</td>
        <td>${integer(row.active_campaign_count)}</td>
        <td>${money(row.confirmed_spend, "USDT")}</td>
        <td>${escapeHtml(shortDate(row.last_sign_in_at || row.created_at))}</td>
      </tr>`).join("")
    : `<tr><td colspan="5" class="admin-table-empty">No advertiser has marketplace activity yet.</td></tr>`;
}

function renderPayments(data) {
  const rows = data.payments || [];
  setText("[data-market-admin-count]", `${integer(rows.length)} record${rows.length === 1 ? "" : "s"}`);
  const tbody = document.querySelector("[data-market-admin-table-body]");
  if (!tbody) return;
  tbody.innerHTML = rows.length
    ? rows.map((row) => `<tr>
        <th scope="row"><strong>${escapeHtml(row.advertiser?.email || "Unknown advertiser")}</strong><span>${escapeHtml(row.campaign_id)}</span></th>
        <td>${money(row.amount, row.asset || "USDT")}</td>
        <td>${escapeHtml(row.network || "—")}</td>
        <td>${statusMarkup(row.status)}</td>
        <td class="market-admin-hash">${escapeHtml(row.transaction_ref || "—")}</td>
        <td>${escapeHtml(shortDate(row.confirmed_at || row.created_at))}</td>
      </tr>`).join("")
    : `<tr><td colspan="6" class="admin-table-empty">No marketplace payments recorded yet.</td></tr>`;
}

async function load() {
  const page = document.body.dataset.marketAdminPage || "overview";
  const scope = page === "moderation" ? "moderation" : page;
  const data = await fetchScope(scope);

  if (page === "overview") renderOverview(data);
  if (page === "channels") renderChannels(data);
  if (page === "campaigns") renderCampaigns(data);
  if (page === "advertisers") renderAdvertisers(data);
  if (page === "payments") renderPayments(data);
  if (page === "moderation") renderCampaigns(data, true);

  document.body.classList.remove("admin-data-loading");
}

load().catch((error) => {
  console.error("[UIORI] marketplace admin load failed", error);
  showError("Marketplace admin data could not be loaded. Refresh and try again.");
  document.body.classList.remove("admin-data-loading");
});
