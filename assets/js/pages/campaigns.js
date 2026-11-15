import { getProfileAvatarUrl, uiOriSupabase } from "../lib/supabase-client.js";

const DEFAULT_AVATAR = "/assets/img/default-avatar.svg";

function setText(selector, value) {
  document.querySelectorAll(selector).forEach((el) => (el.textContent = value));
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

function setIdentity({ name, avatarUrl }) {
  setText("[data-uiori-member-name]", name);
  setText("[data-uiori-member-status]", "Advertiser");
  document.querySelectorAll("[data-uiori-avatar]").forEach((img) => {
    img.src = avatarUrl || DEFAULT_AVATAR;
  });
  document.querySelectorAll("[data-uiori-member-state]").forEach((el) => {
    el.dataset.uioriMemberState = "active";
  });
}

function humanStatus(status) {
  const map = {
    draft: "Draft",
    review: "In review",
    funded: "Funded",
    scheduled: "Scheduled",
    live: "Live",
    completed: "Completed",
    cancelled: "Cancelled",
    refunded: "Refunded",
  };
  return map[status] || status || "Unknown";
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function wireLogout() {
  document.querySelectorAll("[data-uiori-logout]").forEach((control) => {
    control.addEventListener("click", async (event) => {
      event.preventDefault();
      await uiOriSupabase.auth.signOut();
      window.location.replace("/login/");
    });
  });
}

async function loadPage() {
  const {
    data: { user },
    error: userError,
  } = await uiOriSupabase.auth.getUser();

  if (userError || !user) {
    redirectToLogin();
    return;
  }

  const [profileResult, campaignsResult] = await Promise.all([
    uiOriSupabase
      .from("profiles")
      .select("full_name, avatar_path")
      .eq("id", user.id)
      .maybeSingle(),
    uiOriSupabase
      .from("campaigns")
      .select("id, title, status, created_at")
      .order("created_at", { ascending: false }),
  ]);

  if (campaignsResult.error) throw campaignsResult.error;

  const profile = profileResult.data;
  const avatarUrl = profile?.avatar_path
    ? await getProfileAvatarUrl(profile.avatar_path)
    : "";

  setIdentity({ name: safeName(user, profile), avatarUrl });

  const list = document.querySelector("[data-campaigns-list]");
  const empty = document.querySelector("[data-campaigns-empty]");
  const campaigns = campaignsResult.data || [];

  if (campaigns.length) {
    empty?.remove();
    list.replaceChildren(
      ...campaigns.map((campaign) => {
        const row = document.createElement("article");
        row.className = "campaigns-row";

        const title = document.createElement("div");
        title.className = "campaigns-row-title";
        title.innerHTML = `<strong></strong><span></span>`;
        title.querySelector("strong").textContent =
          campaign.title?.trim() || "Untitled campaign";
        title.querySelector("span").textContent = formatDate(campaign.created_at);

        const meta = document.createElement("div");
        meta.className = "campaigns-row-meta";
        meta.innerHTML = `<span>Status</span><strong></strong>`;
        meta.querySelector("strong").textContent = humanStatus(campaign.status);

        const status = document.createElement("span");
        status.className = `campaign-status is-${campaign.status || "unknown"}`;
        status.textContent = humanStatus(campaign.status);

        row.append(title, meta, status);
        return row;
      }),
    );
  }

  document.body.classList.remove("app-auth-loading");
}

wireLogout();
loadPage().catch((error) => {
  console.error("[UIORI] campaigns load failed", error);
  document.body.classList.remove("app-auth-loading");
});
