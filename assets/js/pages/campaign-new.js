import { getProfileAvatarUrl, uiOriSupabase } from "../lib/supabase-client.js";

const DEFAULT_AVATAR = "/assets/img/default-avatar.svg";
let currentStep = 1;
let channels = [];
let selectedChannelIds = new Set();

const form = document.querySelector("[data-campaign-form]");
const picker = document.querySelector("[data-campaign-channel-picker]");
const noInventory = document.querySelector("[data-campaign-no-inventory]");
const backButton = document.querySelector("[data-flow-back]");
const nextButton = document.querySelector("[data-flow-next]");
const saveButton = document.querySelector("[data-campaign-save]");
const errorBox = document.querySelector("[data-campaign-error]");
const titleInput = document.querySelector("[data-campaign-title]");
const textInput = document.querySelector("[data-campaign-text]");
const destinationInput = document.querySelector("[data-campaign-destination]");
const scheduleDateWrap = document.querySelector("[data-schedule-date-wrap]");
const scheduleDateInput = document.querySelector("[data-schedule-date]");

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

function showError(message) {
  if (!errorBox) return;
  errorBox.textContent = message;
  errorBox.hidden = !message;
}

function initials(name = "") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || "")
    .join("");
}

function titleCase(value = "") {
  return String(value)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function renderChannels() {
  if (!picker) return;

  if (!channels.length) {
    picker.replaceChildren();
    noInventory.hidden = false;
    nextButton.disabled = true;
    return;
  }

  noInventory.hidden = true;
  nextButton.disabled = false;
  picker.replaceChildren(
    ...channels.map((channel) => {
      const label = document.createElement("label");
      label.className = "campaign-channel-option";

      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = channel.id;
      input.checked = selectedChannelIds.has(channel.id);
      input.addEventListener("change", () => {
        if (input.checked) selectedChannelIds.add(channel.id);
        else selectedChannelIds.delete(channel.id);
      });

      const card = document.createElement("span");
      card.className = "campaign-channel-card";

      const avatar = document.createElement("span");
      avatar.className = "campaign-channel-avatar";
      avatar.textContent = initials(channel.display_name);

      const copy = document.createElement("span");
      copy.className = "campaign-channel-copy";
      const strong = document.createElement("strong");
      strong.textContent = channel.display_name;
      const meta = document.createElement("span");
      meta.textContent = `${titleCase(channel.category)} · ${titleCase(channel.region)} · ${titleCase(channel.language)}`;
      copy.append(strong, meta);

      const check = document.createElement("span");
      check.className = "campaign-channel-check";

      card.append(avatar, copy, check);
      label.append(input, card);
      return label;
    }),
  );
}

function setStep(step) {
  currentStep = Math.min(4, Math.max(1, step));

  document.querySelectorAll("[data-flow-stage]").forEach((stage) => {
    stage.hidden = Number(stage.dataset.flowStage) !== currentStep;
  });

  document.querySelectorAll("[data-flow-step]").forEach((item) => {
    const number = Number(item.dataset.flowStep);
    item.classList.toggle("is-active", number === currentStep);
    item.classList.toggle("is-complete", number < currentStep);
  });

  backButton.hidden = currentStep === 1;
  nextButton.hidden = currentStep === 4;
  saveButton.hidden = currentStep !== 4;

  if (currentStep === 4) populateReview();
  showError("");
}

function validateStep() {
  if (currentStep === 1) {
    if (!selectedChannelIds.size) {
      showError("Choose at least one active channel.");
      return false;
    }
  }

  if (currentStep === 2) {
    if (!titleInput.value.trim()) {
      showError("Add a campaign name.");
      titleInput.focus();
      return false;
    }
    if (!textInput.value.trim()) {
      showError("Add the sponsored post text.");
      textInput.focus();
      return false;
    }
    const destination = destinationInput.value.trim();
    if (!destination) {
      showError("Add the destination URL.");
      destinationInput.focus();
      return false;
    }
    try {
      const url = new URL(destination);
      if (url.protocol !== "https:") throw new Error("HTTPS required");
    } catch {
      showError("Use a valid HTTPS destination URL.");
      destinationInput.focus();
      return false;
    }
  }

  if (currentStep === 3) {
    const mode = document.querySelector("[data-schedule-mode]:checked")?.value || "asap";
    if (mode === "specific" && !scheduleDateInput.value) {
      showError("Choose the preferred date and time.");
      scheduleDateInput.focus();
      return false;
    }
  }

  return true;
}

function populateReview() {
  const list = document.querySelector("[data-review-channels]");
  const selected = channels.filter((channel) => selectedChannelIds.has(channel.id));
  list.replaceChildren(
    ...selected.map((channel) => {
      const li = document.createElement("li");
      li.textContent = channel.display_name;
      return li;
    }),
  );

  const scheduleMode =
    document.querySelector("[data-schedule-mode]:checked")?.value || "asap";
  setText(
    "[data-review-schedule]",
    scheduleMode === "specific"
      ? new Date(scheduleDateInput.value).toLocaleString()
      : "As soon as available",
  );
  setText("[data-review-creative]", textInput.value.trim());
  setText("[data-review-destination]", destinationInput.value.trim());
}

function wireSchedule() {
  document.querySelectorAll("[data-schedule-mode]").forEach((input) => {
    input.addEventListener("change", () => {
      const specific =
        document.querySelector("[data-schedule-mode]:checked")?.value === "specific";
      scheduleDateWrap.hidden = !specific;
      if (!specific) scheduleDateInput.value = "";
    });
  });
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

async function saveDraft(user) {
  saveButton.disabled = true;
  saveButton.textContent = "Saving…";
  showError("");

  const scheduleMode =
    document.querySelector("[data-schedule-mode]:checked")?.value || "asap";
  const requestedAt =
    scheduleMode === "specific" && scheduleDateInput.value
      ? new Date(scheduleDateInput.value).toISOString()
      : null;

  const creative = {
    text: textInput.value.trim(),
    schedule_mode: scheduleMode,
  };

  const { data: campaign, error: campaignError } = await uiOriSupabase
    .from("campaigns")
    .insert({
      advertiser_id: user.id,
      title: titleInput.value.trim(),
      creative,
      destination: destinationInput.value.trim(),
      status: "draft",
      total_amount_cents: 0,
      currency: "USD",
    })
    .select("id")
    .single();

  if (campaignError) throw campaignError;

  const rows = [...selectedChannelIds].map((channelId, index) => ({
    campaign_id: campaign.id,
    channel_id: channelId,
    requested_at: requestedAt,
    position: index + 1,
  }));

  const { error: itemError } = await uiOriSupabase
    .from("campaign_items")
    .insert(rows);

  if (itemError) {
    await uiOriSupabase.from("campaigns").delete().eq("id", campaign.id);
    throw itemError;
  }

  window.location.replace("/campaigns/");
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

  const [profileResult, channelsResult] = await Promise.all([
    uiOriSupabase
      .from("profiles")
      .select("full_name, avatar_path")
      .eq("id", user.id)
      .maybeSingle(),
    uiOriSupabase
      .from("channels")
      .select("id, display_name, category, region, language")
      .eq("status", "active")
      .order("display_name", { ascending: true }),
  ]);

  if (channelsResult.error) throw channelsResult.error;

  const profile = profileResult.data;
  const avatarUrl = profile?.avatar_path
    ? await getProfileAvatarUrl(profile.avatar_path)
    : "";
  setIdentity({ name: safeName(user, profile), avatarUrl });

  channels = channelsResult.data || [];

  const preselected = new URLSearchParams(window.location.search).get("channel");
  if (preselected && channels.some((channel) => channel.id === preselected)) {
    selectedChannelIds.add(preselected);
  }

  renderChannels();
  setStep(1);
  document.body.classList.remove("app-auth-loading");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validateStep()) return;
    try {
      await saveDraft(user);
    } catch (error) {
      console.error("[UIORI] campaign draft save failed", error);
      showError("We couldn't save this draft. Please try again.");
      saveButton.disabled = false;
      saveButton.textContent = "Save draft";
    }
  });
}

nextButton.addEventListener("click", () => {
  if (!validateStep()) return;
  setStep(currentStep + 1);
});
backButton.addEventListener("click", () => setStep(currentStep - 1));
wireSchedule();
wireLogout();

loadPage().catch((error) => {
  console.error("[UIORI] campaign builder load failed", error);
  showError("The campaign builder could not be loaded.");
  document.body.classList.remove("app-auth-loading");
});
