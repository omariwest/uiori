import { getProfileAvatarUrl, uiOriSupabase } from "../lib/supabase-client.js";

const ACTIVE_CAMPAIGN_STATES = ["review", "funded", "scheduled", "live"];
const DEFAULT_AVATAR = "/assets/img/default-avatar.svg";

function setText(selector, value) {
  document.querySelectorAll(selector).forEach((element) => {
    element.textContent = value;
  });
}

function redirectToLogin() {
  const next = `${window.location.pathname}${window.location.search}`;
  const url = new URL("/login/", window.location.origin);
  if (next && !next.startsWith("/login")) url.searchParams.set("next", next);
  window.location.replace(url.toString());
}

function safeName(user, profile) {
  return (
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "UIORI advertiser"
  );
}

function setIdentity({ name, email, avatarUrl }) {
  setText("[data-uiori-member-name]", name);
  setText("[data-uiori-member-status]", "Advertiser");
  setText("[data-advertiser-email]", email || "Signed-in account");

  document.querySelectorAll("[data-uiori-avatar]").forEach((image) => {
    image.src = avatarUrl || DEFAULT_AVATAR;
  });

  document.querySelectorAll("[data-uiori-member-state]").forEach((element) => {
    element.dataset.uioriMemberState = "active";
  });
}

function formatMoney(value, currency = "USD") {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return "$0.00";

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function humanStatus(status) {
  const labels = {
    draft: "Draft",
    review: "In review",
    funded: "Funded",
    scheduled: "Scheduled",
    live: "Live",
    completed: "Completed",
    cancelled: "Cancelled",
    refunded: "Refunded",
  };
  return labels[status] || status || "Unknown";
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function renderCampaigns(campaigns) {
  const mount = document.querySelector("[data-advertiser-campaign-list]");
  if (!mount || !campaigns.length) return;

  mount.replaceChildren(
    ...campaigns.map((campaign) => {
      const row = document.createElement("article");
      row.className = "advertiser-campaign-row";

      const copy = document.createElement("div");
      copy.className = "advertiser-campaign-copy";

      const title = document.createElement("strong");
      title.textContent = campaign.title?.trim() || "Untitled campaign";

      const meta = document.createElement("span");
      meta.textContent = formatDate(campaign.created_at) || "Campaign";

      copy.append(title, meta);

      const status = document.createElement("span");
      status.className = `advertiser-status is-${campaign.status || "unknown"}`;
      status.textContent = humanStatus(campaign.status);

      row.append(copy, status);
      return row;
    }),
  );
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

async function loadDashboard() {
  try {
    const {
      data: { user },
      error: userError,
    } = await uiOriSupabase.auth.getUser();

    if (userError || !user) {
      redirectToLogin();
      return;
    }

    const [
      profileResult,
      recentCampaignsResult,
      campaignCountResult,
      activeCampaignCountResult,
      favoritesCountResult,
      paymentsResult,
    ] = await Promise.all([
      uiOriSupabase
        .from("profiles")
        .select("full_name, avatar_path")
        .eq("id", user.id)
        .maybeSingle(),
      uiOriSupabase
        .from("campaigns")
        .select("id, title, status, created_at")
        .order("created_at", { ascending: false })
        .limit(5),
      uiOriSupabase
        .from("campaigns")
        .select("id", { count: "exact", head: true }),
      uiOriSupabase
        .from("campaigns")
        .select("id", { count: "exact", head: true })
        .in("status", ACTIVE_CAMPAIGN_STATES),
      uiOriSupabase
        .from("favorites")
        .select("channel_id", { count: "exact", head: true }),
      uiOriSupabase
        .from("payments")
        .select("amount")
        .eq("status", "confirmed"),
    ]);

    if (profileResult.error) {
      console.warn("[UIORI] advertiser profile could not be loaded", profileResult.error);
    }
    if (recentCampaignsResult.error) throw recentCampaignsResult.error;
    if (campaignCountResult.error) throw campaignCountResult.error;
    if (activeCampaignCountResult.error) throw activeCampaignCountResult.error;
    if (favoritesCountResult.error) throw favoritesCountResult.error;
    if (paymentsResult.error) throw paymentsResult.error;

    const profile = profileResult.data;
    const avatarUrl = profile?.avatar_path
      ? await getProfileAvatarUrl(profile.avatar_path)
      : "";

    setIdentity({
      name: safeName(user, profile),
      email: user.email || "",
      avatarUrl,
    });

    const recentCampaigns = recentCampaignsResult.data || [];
    const confirmedSpend = (paymentsResult.data || []).reduce(
      (sum, payment) => sum + Number(payment.amount || 0),
      0,
    );

    setText(
      "[data-advertiser-campaign-count]",
      String(campaignCountResult.count || 0),
    );
    setText(
      "[data-advertiser-active-count]",
      String(activeCampaignCountResult.count || 0),
    );
    setText(
      "[data-advertiser-saved-count]",
      String(favoritesCountResult.count || 0),
    );
    setText("[data-advertiser-spend]", formatMoney(confirmedSpend));

    const emptyState = document.querySelector("[data-advertiser-empty-state]");
    if (emptyState) emptyState.hidden = (campaignCountResult.count || 0) > 0;

    renderCampaigns(recentCampaigns);
    document.body.classList.remove("app-auth-loading");
  } catch (error) {
    console.error("[UIORI] advertiser dashboard load failed", error);
    document.body.classList.remove("app-auth-loading");
  }
}

wireLogout();
loadDashboard();

uiOriSupabase.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_OUT") redirectToLogin();
});
