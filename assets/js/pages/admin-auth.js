import "../components/password-toggle.js";
import { uiOriAdminSupabase } from "../lib/supabase-client.js";

function isAdminPage() {
  return (
    window.location.pathname.startsWith("/admin/") &&
    !window.location.pathname.startsWith("/admin/login/")
  );
}

function safeAdminNext() {
  const value = new URLSearchParams(window.location.search).get("next");
  if (
    !value ||
    !value.startsWith("/admin/") ||
    value.startsWith("//") ||
    value.startsWith("/admin/login")
  ) {
    return "/admin/";
  }
  return value;
}

function showMessage(text, state = "info") {
  const element = document.querySelector("[data-admin-auth-message]");
  if (!element) return;
  element.textContent = text || "";
  element.dataset.state = state;
}

function sessionUsedPassword(accessToken) {
  try {
    const payload = accessToken?.split(".")[1];
    if (!payload) return false;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const claims = JSON.parse(atob(padded));
    return Array.isArray(claims?.amr) &&
      claims.amr.some((entry) => entry?.method === "password");
  } catch {
    return false;
  }
}

async function adminAccess() {
  const {
    data: { session },
  } = await uiOriAdminSupabase.auth.getSession();

  const {
    data: { user },
    error: userError,
  } = await uiOriAdminSupabase.auth.getUser();

  if (userError || !user || !session?.access_token) {
    return { user: null, isAdmin: false };
  }

  const { data: profile, error: profileError } = await uiOriAdminSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return {
    user,
    isAdmin:
      !profileError &&
      profile?.role === "admin" &&
      sessionUsedPassword(session.access_token),
  };
}

function revealAdmin() {
  document.body?.classList.remove("admin-auth-loading");
}

function adminLoginUrl(unauthorized = false) {
  const login = new URL("/admin/login/", window.location.origin);
  const current = `${window.location.pathname}${window.location.search}`;
  if (current.startsWith("/admin/") && !current.startsWith("/admin/login")) {
    login.searchParams.set("next", current);
  }
  if (unauthorized) login.searchParams.set("unauthorized", "1");
  return login.toString();
}

async function protectAdminPage() {
  if (!isAdminPage()) return;

  const access = await adminAccess();
  if (access.isAdmin) {
    revealAdmin();
    return;
  }

  if (access.user) await uiOriAdminSupabase.auth.signOut({ scope: "local" });
  window.location.replace(adminLoginUrl(Boolean(access.user)));
}

function wireAdminLogout() {
  document.querySelectorAll("[data-uiori-admin-logout]").forEach((control) => {
    if (control.dataset.uioriAdminLogoutReady === "true") return;
    control.dataset.uioriAdminLogoutReady = "true";

    control.addEventListener("click", async (event) => {
      event.preventDefault();
      control.setAttribute("aria-disabled", "true");
      try {
        await uiOriAdminSupabase.auth.signOut({ scope: "local" });
      } finally {
        window.location.replace("/admin/login/");
      }
    });
  });
}

async function wireAdminLogin() {
  const form = document.querySelector("#admin-login-form");
  if (!form) return;

  const access = await adminAccess();
  if (access.isAdmin) {
    window.location.replace(safeAdminNext());
    return;
  }

  const params = new URLSearchParams(window.location.search);
  if (params.get("unauthorized") === "1") {
    showMessage("Administrator password sign-in is required.", "error");
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email =
      form.querySelector("#admin-email")?.value.trim().toLowerCase() || "";
    const password = form.querySelector("#admin-password")?.value || "";
    const submit = form.querySelector(".auth-submit");

    if (!email || !password) {
      showMessage("Enter the administrator email and password.", "error");
      return;
    }

    if (submit) {
      submit.disabled = true;
      submit.dataset.defaultLabel ||= submit.textContent.trim();
      submit.textContent = "Checking access…";
    }
    showMessage("Checking administrator access…");

    try {
      const { error } = await uiOriAdminSupabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      const verified = await adminAccess();
      if (!verified.isAdmin) {
        await uiOriAdminSupabase.auth.signOut({ scope: "local" });
        showMessage(
          "Administrator sign-in failed. Check the account details and try again.",
          "error",
        );
        return;
      }

      window.location.replace(safeAdminNext());
    } catch (error) {
      console.error("[UIORI] admin login failed", error);
      showMessage(
        "Administrator sign-in failed. Check the account details and try again.",
        "error",
      );
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.textContent = submit.dataset.defaultLabel || "Sign in to admin";
      }
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  wireAdminLogout();
  await wireAdminLogin();
  await protectAdminPage();
});

uiOriAdminSupabase.auth.onAuthStateChange((event) => {
  if (isAdminPage() && event === "SIGNED_OUT") {
    window.location.replace(adminLoginUrl());
  }
});
