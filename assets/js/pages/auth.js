import { initNavigation } from "../components/navigation.js";
import "../components/password-toggle.js";
import { uiOriSiteUrl, uiOriSupabase } from "../lib/supabase-client.js";

initNavigation();

let pendingConfirmationEmail = "";

function messageElement() {
  return document.querySelector("[data-auth-message]");
}

function clearInlineAction() {
  document.querySelector("[data-auth-inline-action]")?.remove();
}

function showMessage(text, type = "info") {
  const element = messageElement();
  if (!element) return;
  clearInlineAction();
  element.textContent = text || "";
  element.dataset.state = type;
}

function showInlineAction(label, handler) {
  const element = messageElement();
  if (!element || !label || typeof handler !== "function") return;
  clearInlineAction();

  const button = document.createElement("button");
  button.type = "button";
  button.className = "auth-inline-action";
  button.dataset.authInlineAction = "";
  button.textContent = label;
  button.addEventListener("click", handler, { once: true });
  element.insertAdjacentElement("afterend", button);
}

function setBusy(form, busy, busyLabel) {
  const button = form?.querySelector(".auth-submit");
  if (!button) return;
  button.dataset.defaultLabel ||= button.textContent.trim();
  button.disabled = busy;
  button.textContent = busy ? busyLabel : button.dataset.defaultLabel;
}

function setFormEnabled(form, enabled) {
  form?.querySelectorAll("input, button").forEach((control) => {
    control.disabled = !enabled;
  });
}

function safeNext() {
  const value = new URLSearchParams(window.location.search).get("next");
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard/";
  return value;
}

async function redirectIfAlreadySignedIn() {
  const {
    data: { session },
  } = await uiOriSupabase.auth.getSession();
  if (session?.user) window.location.replace(safeNext());
}

async function startGoogleAuth() {
  showMessage("Opening Google sign-in…");
  const { error } = await uiOriSupabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: uiOriSiteUrl(safeNext()) },
  });

  if (error) {
    console.error("[UIORI] Google sign-in failed", error);
    showMessage("Google sign-in could not be started. Please try again or use email.", "error");
  }
}

async function createGoogleNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const nonce = btoa(String.fromCharCode(...bytes));
  const encoded = new TextEncoder().encode(nonce);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  const hashedNonce = Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");

  return { nonce, hashedNonce };
}

function loadGoogleIdentityScript() {
  if (window.google?.accounts?.id) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-uiori-google-identity]');
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.uioriGoogleIdentity = "";
    script.addEventListener("load", resolve, { once: true });
    script.addEventListener("error", reject, { once: true });
    document.head.appendChild(script);
  });
}

async function initializeGoogleOneTap(clientId) {
  if (!clientId) return;

  const {
    data: { session },
  } = await uiOriSupabase.auth.getSession();
  if (session?.user) return;

  try {
    const { nonce, hashedNonce } = await createGoogleNonce();
    await loadGoogleIdentityScript();

    if (!window.google?.accounts?.id) return;

    window.google.accounts.id.initialize({
      client_id: clientId,
      nonce: hashedNonce,
      context: window.location.pathname.startsWith("/signup") ? "signup" : "signin",
      auto_select: false,
      cancel_on_tap_outside: true,
      itp_support: true,
      use_fedcm_for_prompt: true,
      callback: async (response) => {
        if (!response?.credential) return;

        try {
          const { error } = await uiOriSupabase.auth.signInWithIdToken({
            provider: "google",
            token: response.credential,
            nonce,
          });
          if (error) throw error;
          window.location.replace(safeNext());
        } catch (error) {
          console.error("[UIORI] Google One Tap sign-in failed", error);
          showMessage("Google sign-in could not be completed. Please try again.", "error");
        }
      },
    });

    window.google.accounts.id.prompt();
  } catch (error) {
    console.warn("[UIORI] Google One Tap unavailable", error);
  }
}

async function initializeGoogleOneTapFromConfig() {
  try {
    const { data: config, error } = await uiOriSupabase.functions.invoke("public-config", {
      body: {},
    });
    if (error || !config?.ok) return;

    const clientId = config.auth?.google_web_client_id;
    if (config.auth?.google_one_tap_ready === true && clientId) {
      await initializeGoogleOneTap(clientId);
    }
  } catch (error) {
    console.warn("[UIORI] Google One Tap configuration unavailable", error);
  }
}

function wireGoogle() {
  document.querySelectorAll("#login-google-btn, #signup-google-btn").forEach((button) => {
    button.addEventListener("click", startGoogleAuth);
  });
}

async function resendConfirmation(email) {
  if (!email) return;
  showMessage("Sending a fresh confirmation email…");

  try {
    const { error } = await uiOriSupabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: uiOriSiteUrl("/auth/confirm/") },
    });
    if (error) throw error;
    showMessage("A new confirmation email has been sent. Check your inbox and spam folder.", "success");
  } catch (error) {
    console.error("[UIORI] confirmation resend failed", error);
    showMessage("We couldn't resend the confirmation email yet. Please try again shortly.", "error");
  }
}

function offerConfirmationResend(email) {
  pendingConfirmationEmail = email;
  showInlineAction("Resend confirmation email", () => resendConfirmation(pendingConfirmationEmail));
}

function wireSignup() {
  const form = document.querySelector("#signup-form");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = form.querySelector("#full-name")?.value.trim() || "";
    const email = form.querySelector("#email-address")?.value.trim() || "";
    const password = form.querySelector("#password")?.value || "";
    const confirmPassword = form.querySelector("#confirm-password")?.value || "";

    if (!name || !email || !password || !confirmPassword) {
      showMessage("Complete all fields to create your account.", "error");
      return;
    }
    if (password.length < 8) {
      showMessage("Use at least 8 characters for your password.", "error");
      return;
    }
    if (password !== confirmPassword) {
      showMessage("The two passwords do not match.", "error");
      return;
    }

    setBusy(form, true, "Creating account…");
    showMessage("Creating your account…");

    try {
      const { data, error } = await uiOriSupabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: uiOriSiteUrl("/auth/confirm/"),
        },
      });
      if (error) throw error;

      if (data?.session) {
        window.location.replace("/dashboard/");
        return;
      }

      pendingConfirmationEmail = email;
      showMessage("Account created. Check your email to confirm your address.", "success");
      offerConfirmationResend(email);
      form.reset();
    } catch (error) {
      console.error("[UIORI] signup failed", error);
      const raw = String(error?.message || "").toLowerCase();
      if (raw.includes("already") || raw.includes("registered")) {
        showMessage("An account already exists with this email. Log in instead.", "error");
      } else if (raw.includes("password")) {
        showMessage("Choose a stronger password and try again.", "error");
      } else {
        showMessage("We couldn't create your account. Please try again.", "error");
      }
    } finally {
      setBusy(form, false);
    }
  });
}

function wireLogin() {
  const form = document.querySelector("#login-form");
  if (!form) return;

  if (new URLSearchParams(window.location.search).get("confirmed") === "1") {
    showMessage("Email confirmed. You can log in now.", "success");
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = form.querySelector("#email-address")?.value.trim() || "";
    const password = form.querySelector("#password")?.value || "";

    if (!email || !password) {
      showMessage("Enter your email and password to continue.", "error");
      return;
    }

    setBusy(form, true, "Logging in…");
    showMessage("Checking your details…");

    try {
      const { error } = await uiOriSupabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      window.location.replace(safeNext());
    } catch (error) {
      console.error("[UIORI] login failed", error);
      const raw = String(error?.message || "").toLowerCase();
      if (raw.includes("email not confirmed")) {
        showMessage("Confirm your email before logging in.", "error");
        offerConfirmationResend(email);
      } else {
        showMessage(
          "Those details didn't work. Use Google if that is how you created the account, or reset your password.",
          "error",
        );
      }
    } finally {
      setBusy(form, false);
    }
  });
}

function wireForgotPassword() {
  const form = document.querySelector("#forgot-form");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = form.querySelector("#email-address")?.value.trim() || "";
    if (!email) {
      showMessage("Enter your email address first.", "error");
      return;
    }

    setBusy(form, true, "Sending link…");
    showMessage("Preparing your reset link…");

    try {
      const { error } = await uiOriSupabase.auth.resetPasswordForEmail(email, {
        redirectTo: uiOriSiteUrl("/settings/?recovery=1"),
      });
      if (error) throw error;
      showMessage(
        "If that email belongs to a UIORI account, a reset link is on the way.",
        "success",
      );
    } catch (error) {
      console.error("[UIORI] password reset request failed", error);
      const raw = String(error?.message || error || "").toLowerCase();
      if (
        error?.status === 429 ||
        raw.includes("rate limit") ||
        raw.includes("security purposes")
      ) {
        showMessage(
          "A reset email may already be on the way. Check your inbox before requesting another.",
        );
      } else {
        showMessage("We couldn't send the reset link. Please try again shortly.", "error");
      }
    } finally {
      setBusy(form, false);
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  wireGoogle();
  wireSignup();
  wireLogin();
  wireForgotPassword();

  if (window.location.pathname.startsWith("/login") || window.location.pathname.startsWith("/signup")) {
    await redirectIfAlreadySignedIn();
    await initializeGoogleOneTapFromConfig();
  }

});
