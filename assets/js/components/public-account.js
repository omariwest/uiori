import { uiOriSupabase } from "../lib/supabase-client.js";
import { initNavigation } from "./navigation.js";

let resolvedState = "unknown";

function desktopGuestMarkup() {
  return `
    <a class="login-link" href="/login/">Log in</a>
    <a class="button button-dark button-small" href="/signup/">Start earning</a>
  `;
}

function desktopAccountMarkup() {
  return `
    <details class="public-account-menu">
      <summary class="public-account-trigger" aria-label="Account menu">
        <span class="public-account-dot" aria-hidden="true"></span>
        <span>Account</span>
      </summary>
      <div class="public-account-dropdown" role="menu">
        <a href="/dashboard/" role="menuitem">Dashboard</a>
        <a href="/earn/" role="menuitem">Earn</a>
        <a href="/wallet/" role="menuitem">Wallet</a>
        <a href="/settings/" role="menuitem">Settings</a>
        <button type="button" role="menuitem" data-uiori-public-logout>Log out</button>
      </div>
    </details>
  `;
}

function mobileGuestMarkup() {
  return `
    <a class="mobile-login-link" href="/login/">Log in</a>
    <a class="mobile-primary-link" href="/signup/">Start earning</a>
  `;
}

function mobileAccountMarkup() {
  return `
    <a href="/dashboard/">Dashboard</a>
    <button type="button" class="mobile-account-logout" data-uiori-public-logout>Log out</button>
  `;
}

function updatePublicCtas(isSignedIn) {
  document.querySelectorAll('main a[href="/signup/"], footer a[href="/signup/"]').forEach((link) => {
    if (link.dataset.uioriGuestHref === undefined) {
      link.dataset.uioriGuestHref = link.getAttribute("href") || "/signup/";
      link.dataset.uioriGuestText = link.textContent.trim();
    }

    if (isSignedIn) {
      link.href = "/dashboard/";
      const textTarget = link.querySelector("span") || link;
      const current = textTarget.textContent.trim().toLowerCase();
      if (current === "start earning" || current === "create account" || current === "join uiOri") {
        textTarget.textContent = "Open dashboard";
      }
    } else {
      link.setAttribute("href", link.dataset.uioriGuestHref || "/signup/");
      if (link.dataset.uioriGuestText) {
        const textTarget = link.querySelector("span") || link;
        textTarget.textContent = link.dataset.uioriGuestText;
      }
    }
  });
}

function closeAccountMenus() {
  document.querySelectorAll(".public-account-menu[open]").forEach((menu) => {
    menu.removeAttribute("open");
  });
}

function wireLogout() {
  document.querySelectorAll("[data-uiori-public-logout]").forEach((button) => {
    if (button.dataset.uioriPublicLogoutReady === "true") return;
    button.dataset.uioriPublicLogoutReady = "true";

    button.addEventListener("click", async () => {
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
      try {
        await uiOriSupabase.auth.signOut();
      } catch (error) {
        console.error("[UIORI] public logout failed", error);
      } finally {
        window.location.replace("/");
      }
    });
  });
}

function render(isSignedIn) {
  const headerActions = document.querySelector(".header-actions");
  const mobileActions = document.querySelector(".mobile-menu-actions");

  if (headerActions) {
    headerActions.innerHTML = isSignedIn ? desktopAccountMarkup() : desktopGuestMarkup();
    headerActions.dataset.uioriAuthState = isSignedIn ? "authenticated" : "anonymous";
  }

  if (mobileActions) {
    mobileActions.innerHTML = isSignedIn ? mobileAccountMarkup() : mobileGuestMarkup();
    mobileActions.classList.toggle("is-authenticated", isSignedIn);
    mobileActions.dataset.uioriAuthState = isSignedIn ? "authenticated" : "anonymous";
  }

  updatePublicCtas(isSignedIn);
  wireLogout();
  resolvedState = isSignedIn ? "authenticated" : "anonymous";
  document.documentElement.dataset.uioriPublicAuth = resolvedState;
}

async function resolvePublicAccount() {
  try {
    const {
      data: { session },
      error,
    } = await uiOriSupabase.auth.getSession();

    if (error) throw error;
    render(Boolean(session?.user));
  } catch (error) {
    console.warn("[UIORI] public auth state could not be resolved", error);
    render(false);
  }
}

initNavigation();
resolvePublicAccount();

document.addEventListener("click", (event) => {
  const openMenu = document.querySelector(".public-account-menu[open]");
  if (openMenu && !openMenu.contains(event.target)) closeAccountMenus();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeAccountMenus();
});

uiOriSupabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_OUT") render(false);
  else if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "TOKEN_REFRESHED") {
    render(Boolean(session?.user));
  }
});

window.UIORIPublicAccount = {
  get state() {
    return resolvedState;
  },
  refresh: resolvePublicAccount,
};
