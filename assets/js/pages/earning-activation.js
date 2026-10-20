import { uiOriSupabase } from "../lib/supabase-client.js";

let activationState = null;
let loading = false;

function setStatus(message, error = false) {
  const element = document.querySelector("#earning-activation-status");
  if (!element) return;
  element.textContent = message || "";
  element.classList.toggle("is-error", error);
}

async function invokeActivation(body) {
  const { data, error } = await uiOriSupabase.functions.invoke("earning-activation", { body });
  if (error || !data?.ok) {
    const wrapped = new Error(data?.error || error?.message || "activation_error");
    wrapped.code = data?.error || "activation_error";
    wrapped.data = data || null;
    throw wrapped;
  }
  return data;
}

function buttonCopy(state) {
  if (state?.restriction_status === "restricted") {
    return {
      label: "Account review",
      note: "Earning setup is unavailable while this account review is in progress.",
      mode: "restricted",
    };
  }
  if (state?.connection_status === "active" || state?.connection_status === "paused") {
    return {
      label: "Manage participation",
      note: "Mellowtel's independent controls let you review or stop participation at any time.",
      mode: "manage",
    };
  }
  if (state?.provider_ready === false) {
    return {
      label: "Set up earning",
      note: "Earning setup is temporarily unavailable.",
      mode: "unavailable",
    };
  }
  if (state?.connection_status === "pending") {
    return {
      label: "Open Mellowtel",
      note: "Install Mellowtel and choose to participate, then finish setup here.",
      mode: "resume",
    };
  }
  return {
    label: "Set up earning",
    note: "Review what participation uses before anything opens.",
    mode: "setup",
  };
}

function renderState(state) {
  activationState = state;
  const button = document.querySelector("#earning-setup-button");
  const finishButton = document.querySelector("#earning-finish-button");
  const note = document.querySelector("#earning-setup-note");
  const copy = buttonCopy(state);

  if (button) {
    button.textContent = copy.label;
    button.dataset.mode = copy.mode;
    const unavailable = copy.mode === "restricted" || copy.mode === "unavailable";
    button.disabled = unavailable;
    button.setAttribute("aria-disabled", String(unavailable));
  }
  if (finishButton) {
    finishButton.hidden = copy.mode !== "resume";
    finishButton.disabled = false;
  }
  if (note) note.textContent = copy.note;
}

async function loadActivationState() {
  if (loading || window.UIORIAccess?.state === "anonymous") return;
  loading = true;
  try {
    const data = await invokeActivation({ action: "status" });
    renderState(data);
  } catch (error) {
    console.error("[UIORI] earning activation status failed", error);
    const note = document.querySelector("#earning-setup-note");
    if (note) note.textContent = "Earning setup is temporarily unavailable.";
  } finally {
    loading = false;
  }
}

function allAcknowledged(form) {
  return Array.from(form.querySelectorAll('input[type="checkbox"]')).every((input) => input.checked);
}

function resetDialog(form, button) {
  form.reset();
  setStatus("");
  button.disabled = false;
}

function friendlyError(code) {
  const messages = {
    provider_not_ready: "Earning setup is temporarily unavailable.",
    email_not_verified: "Verify your email before starting earning setup.",
    acknowledgement_required: "Review and acknowledge every item before continuing.",
    account_restricted: "Earning setup is unavailable while this account review is in progress.",
    setup_not_started: "Open Mellowtel and complete the setup before finishing here.",
  };
  return messages[code] || "We couldn't open the earning setup. Please try again.";
}

function setupDialog() {
  const openButton = document.querySelector("#earning-setup-button");
  const dialog = document.querySelector("#earning-activation-dialog");
  const form = document.querySelector("#earning-activation-form");
  const continueButton = document.querySelector("#earning-activation-continue");
  const finishButton = document.querySelector("#earning-finish-button");
  const closeButton = document.querySelector("#earning-activation-close");

  if (!openButton || !dialog || !form || !continueButton || !finishButton || !closeButton) return;

  openButton.addEventListener("click", () => {
    if (openButton.dataset.mode === "restricted" || openButton.dataset.mode === "unavailable") return;
    if (openButton.dataset.mode === "manage") {
      const url = activationState?.user_control_url;
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    if (openButton.dataset.mode === "resume") {
      const url = activationState?.launch_url;
      if (url) window.location.assign(url);
      return;
    }

    resetDialog(form, continueButton);
    document.body.classList.add("earning-activation-open");
    dialog.showModal();
  });

  closeButton.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => {
    document.body.classList.remove("earning-activation-open");
    resetDialog(form, continueButton);
  });


  finishButton.addEventListener("click", async () => {
    if (activationState?.connection_status !== "pending") return;

    finishButton.disabled = true;
    openButton.disabled = true;
    const note = document.querySelector("#earning-setup-note");
    if (note) note.textContent = "Finishing your UIORI earning setup…";

    try {
      const data = await invokeActivation({ action: "complete" });
      renderState({
        ...activationState,
        ...data.connection,
        connection_status: data.connection?.status || "active",
        membership_status: data.membership_status || "active",
        user_control_url: data.user_control_url || activationState?.user_control_url,
      });
      window.location.reload();
    } catch (error) {
      console.error("[UIORI] earning setup completion failed", error);
      if (note) note.textContent = friendlyError(error.code || error.message);
      finishButton.disabled = false;
      openButton.disabled = false;
    }
  });

  continueButton.addEventListener("click", async () => {
    if (!allAcknowledged(form)) {
      setStatus("Review and acknowledge every item before continuing.", true);
      return;
    }

    continueButton.disabled = true;
    closeButton.disabled = true;
    setStatus("Preparing the secure Mellowtel setup…");

    try {
      const data = await invokeActivation({
        action: "begin",
        acknowledged_resource_use: true,
        acknowledged_public_ip: true,
        acknowledged_third_party: true,
        acknowledged_control: true,
        acknowledged_reward_terms: true,
      });

      renderState({
        ...activationState,
        ...data.connection,
        connection_status: data.connection?.status || "pending",
        user_control_url: data.user_control_url || activationState?.user_control_url,
      });

      if (!data.launch_url) throw Object.assign(new Error("provider_not_ready"), { code: "provider_not_ready" });
      window.location.assign(data.launch_url);
    } catch (error) {
      console.error("[UIORI] earning setup failed", error);
      setStatus(friendlyError(error.code || error.message), true);
      continueButton.disabled = false;
      closeButton.disabled = false;
    }
  });
}

document.addEventListener("uiori:account-state", (event) => {
  if (event.detail?.state !== "anonymous") window.setTimeout(loadActivationState, 0);
});

document.addEventListener("DOMContentLoaded", () => {
  setupDialog();
  window.setTimeout(loadActivationState, 0);
});
