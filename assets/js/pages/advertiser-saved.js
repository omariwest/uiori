import { getProfileAvatarUrl, uiOriSupabase } from "../lib/supabase-client.js";

const DEFAULT_AVATAR = "/assets/img/default-avatar.svg";

function setText(selector, value) {
  document.querySelectorAll(selector).forEach((el) => (el.textContent = value));
}

function redirectToLogin() {
  const next = `${window.location.pathname}${window.location.search}`;
  const url = new URL("/login/", window.location.origin);
  url.searchParams.set("next", next);
  window.location.replace(url.toString());
}

function safeName(user, profile) {
  return profile?.full_name || user?.user_metadata?.full_name ||
    user?.user_metadata?.name || user?.email?.split("@")[0] || "UIORI advertiser";
}

function initials(name = "") {
  return name.split(/\s+/).filter(Boolean).slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || "").join("");
}

function titleCase(value = "") {
  return String(value).replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
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
  const { data: { user }, error: userError } = await uiOriSupabase.auth.getUser();
  if (userError || !user) return redirectToLogin();

  const [profileResult, favoritesResult, channelsResult] = await Promise.all([
    uiOriSupabase.from("profiles").select("full_name, avatar_path").eq("id", user.id).maybeSingle(),
    uiOriSupabase.from("favorites").select("channel_id, created_at").order("created_at", { ascending: false }),
    uiOriSupabase.from("channels")
      .select("id, display_name, description, category, language, region, status")
      .eq("status", "active"),
  ]);

  if (favoritesResult.error) throw favoritesResult.error;
  if (channelsResult.error) throw channelsResult.error;

  const profile = profileResult.data;
  const avatarUrl = profile?.avatar_path ? await getProfileAvatarUrl(profile.avatar_path) : "";
  setIdentity({ name: safeName(user, profile), avatarUrl });

  const channelById = new Map((channelsResult.data || []).map((row) => [row.id, row]));
  const favorites = (favoritesResult.data || [])
    .map((favorite) => ({ ...favorite, channel: channelById.get(favorite.channel_id) }))
    .filter((row) => row.channel);

  setText("[data-saved-count]", favorites.length);

  const grid = document.querySelector("[data-saved-grid]");
  const empty = document.querySelector("[data-saved-empty]");

  if (favorites.length && grid) {
    empty?.remove();
    grid.replaceChildren(...favorites.map((row) => {
      const card = document.createElement("article");
      card.className = "advertiser-library-card";
      card.dataset.channelId = row.channel.id;

      const top = document.createElement("div");
      top.className = "advertiser-library-card-top";
      top.innerHTML = `<span class="advertiser-library-avatar" aria-hidden="true"></span>
        <button class="advertiser-library-remove" type="button">Remove</button>`;
      top.querySelector(".advertiser-library-avatar").textContent = initials(row.channel.display_name);

      const heading = document.createElement("h2");
      heading.textContent = row.channel.display_name;

      const description = document.createElement("p");
      description.textContent = row.channel.description || "Telegram advertising inventory.";

      const tags = document.createElement("div");
      tags.className = "advertiser-library-tags";
      [row.channel.category, row.channel.region, row.channel.language].forEach((value) => {
        const tag = document.createElement("span");
        tag.textContent = titleCase(value);
        tags.append(tag);
      });

      const action = document.createElement("a");
      action.className = "button button-dark button-small";
      action.href = `/campaigns/new/?channel=${encodeURIComponent(row.channel.id)}`;
      action.textContent = "Start campaign";

      top.querySelector(".advertiser-library-remove").addEventListener("click", async (event) => {
        const button = event.currentTarget;
        button.disabled = true;
        const { error } = await uiOriSupabase.from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("channel_id", row.channel.id);
        if (error) {
          button.disabled = false;
          console.error("[UIORI] remove saved channel failed", error);
          return;
        }
        card.remove();
        setText("[data-saved-count]", Math.max(0, Number(document.querySelector("[data-saved-count]")?.textContent || 1) - 1));
        if (!grid.children.length) window.location.reload();
      });

      card.append(top, heading, description, tags, action);
      return card;
    }));
  }

  document.body.classList.remove("app-auth-loading");
}

wireLogout();
loadPage().catch((error) => {
  console.error("[UIORI] saved channels load failed", error);
  document.body.classList.remove("app-auth-loading");
});
