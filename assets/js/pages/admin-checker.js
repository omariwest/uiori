import "./admin-auth.js";
import "../components/app-navigation.js";
import { uiOriAdminSupabase } from "../lib/supabase-client.js";

const form = document.querySelector("[data-checker-form]");
const input = document.querySelector("#checker-handle");
const submit = document.querySelector("[data-checker-submit]");
const errorBox = document.querySelector("[data-checker-error]");
const result = document.querySelector("[data-checker-result]");

function number(value, digits = 0) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
  }).format(Number(value) || 0);
}

function percent(value, digits = 1) {
  return `${number(value, digits)}%`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cleanHandle(value) {
  return String(value || "")
    .trim()
    .replace(/^https?:\/\/t\.me\/s\//i, "")
    .replace(/^https?:\/\/t\.me\//i, "")
    .replace(/^@/, "")
    .split(/[/?#]/)[0]
    .trim();
}

function timeAgo(value) {
  if (!value) return "—";
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "—";
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function shortDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function setBusy(busy) {
  if (!submit) return;
  submit.disabled = busy;
  submit.textContent = busy ? "Checking…" : "Check channel";
}

function showError(message) {
  if (!errorBox) return;
  errorBox.textContent = message || "";
  errorBox.hidden = !message;
}

function decisionLabel(verdict) {
  if (verdict === "Good") return "Worth a small test";
  if (verdict === "Avoid") return "Skip this channel";
  return "Test carefully";
}

function renderSparkline(history) {
  const element = document.querySelector("[data-checker-sparkline]");
  if (!element) return;

  const rows = Array.isArray(history) ? history.slice(-30) : [];
  if (!rows.length) {
    element.innerHTML = "";
    return;
  }

  const values = rows.map((row) => Number(row.subscribers) || 0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const width = 240;
  const height = 70;
  const denominator = Math.max(1, values.length - 1);
  const points = values.map((value, index) => {
    const x = (index / denominator) * width;
    const y = height - 8 - ((value - min) / range) * (height - 16);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  element.innerHTML = `<svg aria-label="Subscriber history" role="img" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"><polyline points="${points}"></polyline></svg>`;
}

function render(data) {
  const channel = data.channel || {};
  const metrics = data.metrics || {};
  const growth = data.growth || {};

  const handle = document.querySelector("[data-checker-handle]");
  if (handle) {
    handle.textContent = channel.handle || "";
    handle.href = channel.public_url || "#";
  }

  document.querySelector("[data-checker-title]").textContent = channel.title || channel.handle || "Telegram channel";
  document.querySelector("[data-checker-description]").textContent = channel.description || "No public description.";
  document.querySelector("[data-checker-decision]").textContent = decisionLabel(metrics.verdict);

  const verdict = document.querySelector("[data-checker-verdict]");
  verdict.textContent = metrics.verdict || "Caution";
  verdict.className = `checker-verdict is-${String(metrics.verdict || "caution").toLowerCase()}`;

  const metricRows = [
    ["Subscribers", number(channel.subscribers)],
    ["Median views", number(metrics.median_views)],
    ["Average views", number(metrics.average_views)],
    ["Median reach", percent(metrics.median_reach_pct)],
    ["Posts / week", number(metrics.posts_per_week, 1)],
    ["Last post", timeAgo(metrics.latest_post_at)],
    ["Consistency", number(metrics.consistency_ratio, 2)],
    ["Explicit ads", percent(metrics.promo_marked_pct, 1)],
  ];

  document.querySelector("[data-checker-metrics]").innerHTML = metricRows
    .map(([label, value]) => `<div class="checker-metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`)
    .join("");

  document.querySelector("[data-checker-reasons]").innerHTML = (metrics.reasons || [])
    .map((reason) => `<li>${escapeHtml(reason)}</li>`)
    .join("");

  const growthValue = Number(growth.change_since_first) || 0;
  document.querySelector("[data-checker-growth]").textContent = growthValue > 0
    ? `+${number(growthValue)}`
    : number(growthValue);
  document.querySelector("[data-checker-growth-note]").textContent = (data.history || []).length > 1
    ? `Tracked since ${shortDate(growth.first_tracked_at)}.`
    : "UIORI starts building history from the first check.";
  renderSparkline(data.history);

  const posts = Array.isArray(data.recent_posts) ? data.recent_posts : [];
  document.querySelector("[data-checker-post-count]").textContent =
    `${number(metrics.posts_analyzed)} posts analyzed`;
  document.querySelector("[data-checker-posts]").innerHTML = posts.slice(0, 10)
    .map((post) => `<tr>
      <td>${escapeHtml(post.text || "Post " + post.message_id)}</td>
      <td>${escapeHtml(shortDate(post.date))}</td>
      <td>${escapeHtml(number(post.views))}</td>
      <td>${escapeHtml(number(post.reactions))}</td>
    </tr>`)
    .join("");

  result.hidden = false;
}

async function checkChannel(handle) {
  const { data, error } = await uiOriAdminSupabase.functions.invoke("channel-checker", {
    body: { handle },
  });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || "channel_check_failed");
  return data;
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  showError("");

  const handle = cleanHandle(input?.value);
  if (!handle) {
    showError("Enter a public Telegram channel handle.");
    input?.focus();
    return;
  }

  setBusy(true);
  try {
    const data = await checkChannel(handle);
    render(data);
  } catch (error) {
    console.error("[UIORI] channel checker failed", error);
    const code = error?.message || "";
    const message = code.includes("not_public") || code.includes("not_found")
      ? "That channel is not publicly readable on Telegram."
      : "The channel could not be checked right now. Try again.";
    showError(message);
  } finally {
    setBusy(false);
  }
});