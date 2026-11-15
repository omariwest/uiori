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
    approved: "Approved",
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

function showPageError(message) {
  const existing = document.querySelector("[data-campaigns-page-error]");
  if (existing) {
    existing.textContent = message;
    existing.hidden = !message;
    return;
  }

  const panel = document.querySelector(".campaigns-panel");
  if (!panel) return;
  const box = document.createElement("p");
  box.className = "campaigns-page-error";
  box.dataset.campaignsPageError = "";
  box.setAttribute("role", "alert");
  box.textContent = message;
  panel.insertAdjacentElement("beforebegin", box);
}

async function submitCampaign(campaignId, button) {
  button.disabled = true;
  const previous = button.textContent;
  button.textContent = "Submitting…";
  showPageError("");

  try {
    const { data, error } = await uiOriSupabase.functions.invoke("campaign-workflow", {
      body: { action: "submit", campaign_id: campaignId },
    });

    if (error) throw error;
    if (!data?.ok) throw new Error(data?.error || "submit_failed");

    window.location.reload();
  } catch (error) {
    console.error("[UIORI] campaign submission failed", error);
    showPageError("This campaign could not be submitted for review. Check the draft and try again.");
    button.disabled = false;
    button.textContent = previous;
  }
}

async function startPayment(campaignId, button) {
  const previous = button.textContent;
  button.disabled = true;
  button.textContent = "Opening checkout…";
  showPageError("");

  try {
    const { data, error } = await uiOriSupabase.functions.invoke("nowpayments-create-invoice", {
      body: { campaign_id: campaignId },
    });

    if (error) throw error;
    if (!data?.ok || !data?.checkout_url) {
      const code = data?.error || "payment_unavailable";
      if (code === "payment_provider_not_configured") {
        throw new Error("payment_provider_not_configured");
      }
      throw new Error(code);
    }

    window.location.assign(data.checkout_url);
  } catch (error) {
    console.error("[UIORI] payment checkout failed", error);
    showPageError(
      error?.message === "payment_provider_not_configured"
        ? "Crypto checkout is not activated yet."
        : "Crypto checkout could not be opened. Please try again.",
    );
    button.disabled = false;
    button.textContent = previous;
  }
}

function renderCampaign(campaign) {
  const row = document.createElement("article");
  row.className = "campaigns-row";

  const title = document.createElement("div");
  title.className = "campaigns-row-title";

  const heading = document.createElement("strong");
  heading.textContent = campaign.title?.trim() || "Untitled campaign";

  const date = document.createElement("span");
  date.textContent = formatDate(campaign.submitted_at || campaign.created_at);

  title.append(heading, date);

  if (campaign.review_feedback) {
    const feedback = document.createElement("p");
    feedback.className = "campaigns-review-feedback";
    feedback.textContent = campaign.review_feedback;
    title.append(feedback);
  }

  const meta = document.createElement("div");
  meta.className = "campaigns-row-meta";
  meta.innerHTML = `<span>Status</span><strong></strong>`;
  meta.querySelector("strong").textContent = humanStatus(campaign.status);

  const status = document.createElement("span");
  status.className = `campaign-status is-${campaign.status || "unknown"}`;
  status.textContent = humanStatus(campaign.status);

  const actions = document.createElement("div");
  actions.className = "campaigns-row-actions";

  if (campaign.status === "draft") {
    const edit = document.createElement("a");
    edit.className = "button button-secondary button-small";
    edit.href = `/campaigns/new/?draft=${encodeURIComponent(campaign.id)}`;
    edit.textContent = campaign.review_feedback ? "Edit changes" : "Edit";

    const submit = document.createElement("button");
    submit.className = "button button-primary button-small";
    submit.type = "button";
    submit.textContent = campaign.review_feedback ? "Resubmit" : "Submit for review";
    submit.addEventListener("click", () => submitCampaign(campaign.id, submit));

    actions.append(edit, submit);
  } else if (campaign.status === "approved") {
    const pay = document.createElement("button");
    pay.className = "button button-primary button-small";
    pay.type = "button";
    pay.textContent = campaign.total_amount_cents
      ? `Pay ${(Number(campaign.total_amount_cents) / 100).toFixed(2)}`
      : "Pay with crypto";
    pay.addEventListener("click", () => startPayment(campaign.id, pay));
    actions.append(pay);
  } else if (campaign.status === "review") {
    const note = document.createElement("span");
    note.className = "campaigns-row-action-note";
    note.textContent = "Locked while UIORI reviews the campaign.";
    actions.append(note);
  } else if (campaign.status === "cancelled" && campaign.review_feedback) {
    const note = document.createElement("span");
    note.className = "campaigns-row-action-note";
    note.textContent = "Rejected by moderation.";
    actions.append(note);
  }

  row.append(title, meta, status, actions);
  return row;
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
      .select("id, title, status, total_amount_cents, review_feedback, submitted_at, reviewed_at, created_at")
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
    list.replaceChildren(...campaigns.map(renderCampaign));
  }

  document.body.classList.remove("app-auth-loading");
}

wireLogout();
loadPage().catch((error) => {
  console.error("[UIORI] campaigns load failed", error);
  showPageError("Campaigns could not be loaded. Refresh and try again.");
  document.body.classList.remove("app-auth-loading");
});