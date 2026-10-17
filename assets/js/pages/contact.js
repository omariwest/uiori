import { initNavigation } from "../components/navigation.js";
import { initCustomSelects } from "../components/custom-select.js";
import { uiOriSupabase } from "../lib/supabase-client.js";

initNavigation();
initCustomSelects();

const form = document.querySelector("#contact-form");
const status = document.querySelector("[data-contact-status]");

function showStatus(message, state = "info") {
  if (!status) return;
  status.textContent = message;
  status.dataset.state = state;
}

function setBusy(busy) {
  const button = form?.querySelector('button[type="submit"]');
  if (!button) return;
  if (!button.dataset.defaultLabel) button.dataset.defaultLabel = button.textContent.trim();
  button.disabled = busy;
  button.textContent = busy ? "Sending…" : button.dataset.defaultLabel;
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const data = new FormData(form);
  const payload = {
    name: String(data.get("name") || "").trim(),
    email: String(data.get("email") || "").trim(),
    topic: String(data.get("topic") || "").trim(),
    message: String(data.get("message") || "").trim(),
    company: String(data.get("company") || "").trim(),
  };

  if (!payload.name || !payload.email || !payload.topic || !payload.message) {
    showStatus("Complete all fields before sending your message.", "error");
    return;
  }

  setBusy(true);
  showStatus("Sending your message…");

  try {
    const { data: result, error } = await uiOriSupabase.functions.invoke("contact", {
      body: payload,
    });

    if (error || !result?.ok) {
      const code = result?.error || error?.message || "";
      if (String(code).includes("rate_limited")) {
        showStatus("Too many messages were sent recently. Please try again in a few minutes.", "error");
      } else {
        showStatus("We couldn't send your message. Please try again shortly.", "error");
      }
      return;
    }

    form.reset();
    showStatus(
      result.delivered
        ? "Message sent to UIORI Support."
        : "Message received and safely queued for UIORI Support.",
      "success",
    );
  } catch (error) {
    console.error("[UIORI] contact submission failed", error);
    showStatus("We couldn't send your message. Please try again shortly.", "error");
  } finally {
    setBusy(false);
  }
});
