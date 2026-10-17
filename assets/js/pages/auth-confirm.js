import { uiOriSupabase } from "../lib/supabase-client.js";

const status = document.querySelector("[data-confirm-status]");
const support = document.querySelector("[data-confirm-support]");

function setStatus(message, state = "info") {
  if (!status) return;
  status.textContent = message;
  status.dataset.state = state;
}

function authLinkParameters() {
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  return {
    tokenHash: query.get("token_hash") || hash.get("token_hash") || "",
    type: query.get("type") || hash.get("type") || "",
  };
}

function destinationFor(type) {
  if (type === "recovery") return "/settings/?recovery=1";
  if (type === "email_change") return "/settings/?email_changed=1";
  return "/dashboard/?welcome=1";
}

function pendingMessage(type) {
  if (type === "recovery") return "Verifying your reset link…";
  if (type === "email_change") return "Confirming your email change…";
  return "Confirming your email…";
}

async function confirm() {
  const { tokenHash, type } = authLinkParameters();
  setStatus(pendingMessage(type));

  if (tokenHash && type) {
    const { error } = await uiOriSupabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (error) {
      setStatus(
        "This UIORI link is incomplete, expired, or has already been used.",
        "error",
      );
      support?.removeAttribute("hidden");
      return;
    }

    window.location.replace(destinationFor(type));
    return;
  }

  const {
    data: { session },
    error,
  } = await uiOriSupabase.auth.getSession();

  if (error || !session?.user) {
    setStatus(
      "This UIORI link is incomplete, expired, or has already been used.",
      "error",
    );
    support?.removeAttribute("hidden");
    return;
  }

  window.location.replace(destinationFor(type));
}

confirm();
