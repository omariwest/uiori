import { uiOriSupabase } from "../lib/supabase-client.js";
import { initCustomSelects } from "../components/custom-select.js";

const grid = document.querySelector("[data-market-grid]");
const count = document.querySelector("[data-market-results-count]");
const empty = document.querySelector("[data-market-empty]");
const emptyTitle = document.querySelector("[data-market-empty-title]");
const emptyCopy = document.querySelector("[data-market-empty-copy]");
const search = document.querySelector("[data-market-search]");
const filters = Array.from(document.querySelectorAll("[data-market-filter]"));
const sort = document.querySelector("[data-market-sort]");
const clear = document.querySelector("[data-market-clear]");

let channels = [];
let loadError = null;
let currentUser = null;
let savedChannelIds = new Set();

function titleCase(value = "") {
  return String(value)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function initials(name = "") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || "")
    .join("");
}

function formatMoney(cents, currency = "USD") {
  if (!Number.isFinite(Number(cents))) return "";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(Number(cents) / 100);
  } catch {
    return `$${(Number(cents) / 100).toFixed(2)}`;
  }
}

function uniqueValues(key) {
  return [...new Set(channels.map((channel) => channel[key]).filter(Boolean))]
    .sort((a, b) => String(a).localeCompare(String(b)));
}

function populateSelect(key) {
  const select = filters.find((item) => item.dataset.marketFilter === key);
  if (!select) return;

  const current = select.value;
  const first = select.options[0]?.cloneNode(true);
  select.replaceChildren(first);

  uniqueValues(key).forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = titleCase(value);
    select.append(option);
  });

  if ([...select.options].some((option) => option.value === current)) {
    select.value = current;
  }
}

function cardMarkup(channel) {
  const metric = channel.metric;
  const offer = channel.offer;
  const metricBits = [];

  if (metric?.subscribers != null) {
    metricBits.push(`<div><span>Subscribers</span><strong>${Number(metric.subscribers).toLocaleString()}</strong></div>`);
  }
  if (metric?.median_24h_views != null) {
    metricBits.push(`<div><span>Median 24h views</span><strong>${Number(metric.median_24h_views).toLocaleString()}</strong></div>`);
  }
  if (metric?.err_percent != null) {
    metricBits.push(`<div><span>ERR</span><strong>${Number(metric.err_percent).toFixed(1)}%</strong></div>`);
  }
  if (offer?.price_cents != null) {
    metricBits.push(`<div><span>From</span><strong>${formatMoney(offer.price_cents, offer.currency)}</strong></div>`);
  }

  if (!metricBits.length) {
    metricBits.push(
      `<div><span>Region</span><strong>${titleCase(channel.region)}</strong></div>`,
      `<div><span>Language</span><strong>${titleCase(channel.language)}</strong></div>`,
    );
  }

  return `
    <article class="marketplace-channel-card">
      <div class="marketplace-channel-top">
        <span class="marketplace-channel-avatar" aria-hidden="true">${initials(channel.display_name)}</span>
        <span class="marketplace-channel-status">Verified inventory</span>
      </div>

      <h2>${channel.display_name}</h2>
      <p class="marketplace-channel-description">${channel.description || "Telegram advertising inventory."}</p>

      <div class="marketplace-channel-tags" aria-label="Channel tags">
        <span>${titleCase(channel.category)}</span>
        <span>${titleCase(channel.region)}</span>
        <span>${titleCase(channel.language)}</span>
      </div>

      <div class="marketplace-channel-meta">
        ${metricBits.slice(0, 4).join("")}
      </div>

      <div class="marketplace-channel-actions">
        <a class="button button-dark button-small" href="/campaigns/new/?channel=${encodeURIComponent(channel.id)}">Start campaign</a>
        <button
          aria-pressed="${savedChannelIds.has(channel.id) ? "true" : "false"}"
          class="marketplace-save-button${savedChannelIds.has(channel.id) ? " is-saved" : ""}"
          data-market-save="${channel.id}"
          type="button"
        >${savedChannelIds.has(channel.id) ? "Saved" : "Save"}</button>
      </div>
    </article>
  `;
}

function normalizedSearch() {
  return search?.value.trim().toLowerCase() || "";
}

function selectedFilters() {
  const values = {};
  filters.forEach((select) => {
    values[select.dataset.marketFilter] = select.value;
  });
  return values;
}

function filteredChannels() {
  const query = normalizedSearch();
  const values = selectedFilters();

  const result = channels.filter((channel) => {
    if (
      query &&
      ![
        channel.display_name,
        channel.description,
        channel.category,
        channel.region,
        channel.language,
        channel.telegram_handle,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    ) {
      return false;
    }

    return Object.entries(values).every(([key, value]) => {
      return !value || channel[key] === value;
    });
  });

  const mode = sort?.value || "priority";
  result.sort((a, b) => {
    if (mode === "name") return a.display_name.localeCompare(b.display_name);
    if (mode === "region") {
      return String(a.region).localeCompare(String(b.region)) ||
        a.display_name.localeCompare(b.display_name);
    }

    const aViews = Number(a.metric?.median_24h_views || 0);
    const bViews = Number(b.metric?.median_24h_views || 0);
    return bViews - aViews || a.display_name.localeCompare(b.display_name);
  });

  return result;
}

function render() {
  if (!grid || !count || !empty) return;

  const result = filteredChannels();
  grid.innerHTML = result.map(cardMarkup).join("");
  count.textContent = channels.length
    ? `${result.length} of ${channels.length} channels shown`
    : "0 live channels";

  if (loadError) {
    emptyTitle.textContent = "Marketplace data could not be loaded.";
    emptyCopy.textContent = "Please try again shortly.";
  } else if (channels.length && !result.length) {
    emptyTitle.textContent = "No channels match those filters.";
    emptyCopy.textContent = "Clear one or more filters and try again.";
  } else {
    emptyTitle.textContent = "No live inventory yet.";
    emptyCopy.textContent =
      "Channels will appear here after UIORI activates them with real marketplace data.";
  }

  empty.hidden = result.length !== 0;
  grid.hidden = result.length === 0;
}

function resetFilters() {
  if (search) search.value = "";
  filters.forEach((select) => {
    select.value = "";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  if (sort) {
    sort.value = "priority";
    sort.dispatchEvent(new Event("change", { bubbles: true }));
  }
  render();
}

async function loadMarketplace() {
  try {
    const {
      data: { user },
    } = await uiOriSupabase.auth.getUser();
    currentUser = user || null;

    const [channelsResult, metricsResult, offersResult, favoritesResult] = await Promise.all([
      uiOriSupabase
        .from("channels")
        .select("id, slug, telegram_handle, display_name, description, category, language, region, ownership_type, verified_at")
        .eq("status", "active"),
      uiOriSupabase
        .from("channel_metrics")
        .select("channel_id, subscribers, recent_views, median_24h_views, p25_24h_views, p25_72h_views, err_percent, measured_at")
        .order("measured_at", { ascending: false }),
      uiOriSupabase
        .from("channel_offers")
        .select("id, channel_id, format, price_cents, currency, guaranteed_views, min_live_hours, max_delivery_hours")
        .eq("active", true)
        .order("price_cents", { ascending: true }),
      currentUser
        ? uiOriSupabase.from("favorites").select("channel_id")
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (channelsResult.error) throw channelsResult.error;
    if (metricsResult.error) throw metricsResult.error;
    if (offersResult.error) throw offersResult.error;
    if (favoritesResult.error) throw favoritesResult.error;

    savedChannelIds = new Set((favoritesResult.data || []).map((row) => row.channel_id));

    const latestMetric = new Map();
    for (const metric of metricsResult.data || []) {
      if (!latestMetric.has(metric.channel_id)) {
        latestMetric.set(metric.channel_id, metric);
      }
    }

    const firstOffer = new Map();
    for (const offer of offersResult.data || []) {
      if (!firstOffer.has(offer.channel_id)) {
        firstOffer.set(offer.channel_id, offer);
      }
    }

    channels = (channelsResult.data || []).map((channel) => ({
      ...channel,
      metric: latestMetric.get(channel.id) || null,
      offer: firstOffer.get(channel.id) || null,
    }));

    populateSelect("category");
    populateSelect("region");
    populateSelect("language");
  } catch (error) {
    console.error("[UIORI] marketplace load failed", error);
    loadError = error;
    channels = [];
  }

  initCustomSelects();
  render();
}

search?.addEventListener("input", render);
filters.forEach((select) => select.addEventListener("change", render));
sort?.addEventListener("change", render);
clear?.addEventListener("click", resetFilters);

grid?.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-market-save]");
  if (!button) return;

  const channelId = button.dataset.marketSave;
  if (!channelId) return;

  if (!currentUser) {
    const login = new URL("/login/", window.location.origin);
    login.searchParams.set("next", "/marketplace/");
    window.location.assign(login.toString());
    return;
  }

  button.disabled = true;
  const alreadySaved = savedChannelIds.has(channelId);

  try {
    if (alreadySaved) {
      const { error } = await uiOriSupabase
        .from("favorites")
        .delete()
        .eq("user_id", currentUser.id)
        .eq("channel_id", channelId);
      if (error) throw error;
      savedChannelIds.delete(channelId);
    } else {
      const { error } = await uiOriSupabase
        .from("favorites")
        .insert({ user_id: currentUser.id, channel_id: channelId });
      if (error && error.code !== "23505") throw error;
      savedChannelIds.add(channelId);
    }

    render();
  } catch (error) {
    console.error("[UIORI] saving channel failed", error);
    button.disabled = false;
  }
});

loadMarketplace();