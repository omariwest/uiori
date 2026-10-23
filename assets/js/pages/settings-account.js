import "../components/password-toggle.js";
import { uiOriSupabase } from "../lib/supabase-client.js";
import { initCustomSelects } from "../components/custom-select.js";

function formatMemberSince(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" }).format(date);
}

function setStatus(message, error = false) {
  const status = document.querySelector("#settings-save-status");
  if (!status) return;
  status.textContent = message || "";
  status.classList.toggle("is-error", error);
}

function setSecurityStatus(message, error = false, success = false) {
  const status = document.querySelector("#settings-security-status");
  if (!status) return;
  status.textContent = message || "";
  status.classList.toggle("is-error", error);
  status.classList.toggle("is-success", success && !error);
}

function setDeleteStatus(message, error = false) {
  const status = document.querySelector("#settings-delete-status");
  if (!status) return;
  status.textContent = message || "";
  status.classList.toggle("is-error", error);
}

function setPayoutInlineStatus(message, error = false) {
  const status = document.querySelector("#settings-payout-inline-status");
  if (!status) return;
  status.textContent = message || "";
  status.classList.toggle("is-error", error);
}

function setPayoutDialogStatus(message, error = false) {
  const status = document.querySelector("#settings-payout-dialog-status");
  if (!status) return;
  status.textContent = message || "";
  status.classList.toggle("is-error", error);
}

function openDialogWithoutMobileKeyboard(dialog, desktopInput) {
  const desktopPointer = window.matchMedia(
    "(hover: hover) and (pointer: fine)",
  ).matches;
  if (!desktopPointer) dialog.setAttribute("tabindex", "-1");
  else dialog.removeAttribute("tabindex");

  dialog.showModal();

  if (desktopPointer && desktopInput) {
    window.setTimeout(() => desktopInput.focus(), 0);
  } else {
    dialog.focus({ preventScroll: true });
  }
}

async function invokeWallet(body) {
  const { data, error } = await uiOriSupabase.functions.invoke("wallet", { body });
  if (error || !data?.ok) {
    const wrapped = new Error(data?.error || error?.message || "wallet_error");
    wrapped.code = data?.error || "wallet_error";
    throw wrapped;
  }
  return data;
}

function renderPayoutSettings(data) {
  const label = document.querySelector("[data-uiori-payout-settings-status]");
  const button = document.querySelector("#settings-payout-button");
  if (!label || !button) return;

  if (data?.destination) {
    const networkLabel = data.destination.network === "BEP20"
      ? "BNB Smart Chain"
      : data.destination.network;
    label.textContent = `${data.destination.asset} · ${networkLabel} · ${data.destination.masked_address}`;
    button.textContent = "Change";
    const readyAt = data.destination.ready_at ? new Date(data.destination.ready_at) : null;
    if (readyAt && readyAt.getTime() > Date.now()) {
      setPayoutInlineStatus("24-hour safety period is active after this payout change.");
    } else {
      setPayoutInlineStatus("Payout destination is ready for eligible withdrawal requests.");
    }
  } else {
    label.textContent = "Not configured";
    button.textContent = "Configure";
    setPayoutInlineStatus("Add a USDT destination before your first withdrawal.");
  }
}

async function loadPayoutSettings() {
  try {
    const data = await invokeWallet({ action: "status" });
    renderPayoutSettings(data);
    return data;
  } catch (error) {
    console.error("[UIORI] payout settings load failed", error);
    setPayoutInlineStatus("We couldn't load payout details right now.", true);
    return null;
  }
}

function setupPayoutSettings() {
  const openButton = document.querySelector("#settings-payout-button");
  const drawer = document.querySelector("#settings-payout-dialog");
  const close = document.querySelector("#settings-payout-close");
  const cancel = document.querySelector("#settings-payout-cancel");
  const save = document.querySelector("#settings-payout-save");
  const address = document.querySelector("#settings-payout-address");
  if (!openButton || !drawer || !close || !cancel || !save || !address) return;

  function openDrawer() {
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    document.body.classList.add("settings-payout-drawer-open");
    window.setTimeout(() => close.focus({ preventScroll: true }), 0);
  }

  function closeDrawer() {
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("settings-payout-drawer-open");
    openButton.focus({ preventScroll: true });
  }

  openButton.addEventListener("click", async () => {
    if (openButton.disabled) return;
    address.value = "";
    setPayoutDialogStatus("");
    await loadPayoutSettings();
    openDrawer();
  });

  close.addEventListener("click", closeDrawer);
  cancel.addEventListener("click", closeDrawer);
  drawer.addEventListener("click", (event) => {
    if (event.target === drawer) closeDrawer();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && drawer.classList.contains("is-open")) {
      closeDrawer();
    }
  });

  save.addEventListener("click", async () => {
    if (save.disabled) return;
    const walletAddress = address.value.trim();
    if (!walletAddress) {
      setPayoutDialogStatus("Enter the receiving wallet address.", true);
      return;
    }

    save.disabled = true;
    cancel.disabled = true;
    address.disabled = true;
    setPayoutDialogStatus("Saving payout destination…");

    try {
      const data = await invokeWallet({
        action: "save_payout",
        network: "BEP20",
        address: walletAddress,
      });
      setPayoutDialogStatus("Saved. The 24-hour payout safety period has started.");
      await loadPayoutSettings();
      window.setTimeout(closeDrawer, 850);
    } catch (error) {
      console.error("[UIORI] payout destination save failed", error);
      const message = error.code === "invalid_payout_address"
        ? "Enter a valid BNB Smart Chain (BEP20) address."
        : error.code === "payout_address_in_use"
          ? "That payout address is already linked to another UIORI account."
          : "We couldn't save the payout destination. Please try again.";
      setPayoutDialogStatus(message, true);
    } finally {
      save.disabled = false;
      cancel.disabled = false;
      address.disabled = false;
    }
  });
}

function hydrate(identity) {
  const name = document.querySelector("#settings-name");
  const email = document.querySelector("#settings-email");
  const memberSince = document.querySelector("[data-uiori-member-since]");
  const save = document.querySelector("#settings-save-button");
  const payoutButton = document.querySelector("#settings-payout-button");
  const deleteAccount = document.querySelector("#settings-delete-account-button");

  if (name) name.value = identity?.profile?.full_name || identity?.name || "";
  if (email) email.value = identity?.user?.email || identity?.email || "";
  if (memberSince) memberSince.textContent = formatMemberSince(identity?.memberSince);
  if (save) save.disabled = false;
  if (payoutButton) payoutButton.disabled = false;
  if (deleteAccount) deleteAccount.disabled = false;
}

async function currentUser() {
  const {
    data: { user },
    error,
  } = await uiOriSupabase.auth.getUser();
  if (error || !user) throw error || new Error("Not signed in.");
  return user;
}

function passwordRecoveryMode() {
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return query.get("recovery") === "1" || hash.get("type") === "recovery";
}

function focusPasswordField() {
  window.setTimeout(() => {
    document.querySelector("#settings-new-password")?.focus();
  }, 0);
}

function cleanRecoveryUrl() {
  const query = new URLSearchParams(window.location.search);
  query.delete("recovery");
  const cleanQuery = query.toString();
  window.history.replaceState(
    {},
    "",
    `${window.location.pathname}${cleanQuery ? `?${cleanQuery}` : ""}`,
  );
}

function setupPasswordChange() {
  const form = document.querySelector("#settings-password-form");
  const password = document.querySelector("#settings-new-password");
  const confirmPassword = document.querySelector("#settings-confirm-password");
  const save = document.querySelector("#settings-password-save");
  if (!form || !password || !confirmPassword || !save) return;

  if (passwordRecoveryMode()) {
    setSecurityStatus("Reset link verified. Choose a new password.", false, true);
    focusPasswordField();
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const nextPassword = password.value;
    const confirmedPassword = confirmPassword.value;

    if (nextPassword.length < 8) {
      setSecurityStatus("Use at least 8 characters for your new password.", true);
      return;
    }

    if (nextPassword !== confirmedPassword) {
      setSecurityStatus("The two passwords do not match.", true);
      return;
    }

    save.disabled = true;
    password.disabled = true;
    confirmPassword.disabled = true;
    setSecurityStatus("Saving password…");

    try {
      const { error } = await uiOriSupabase.auth.updateUser({
        password: nextPassword,
      });
      if (error) throw error;

      form.reset();
      cleanRecoveryUrl();
      setSecurityStatus("Password changed successfully.", false, true);
    } catch (error) {
      console.error("[UIORI] password update failed", error);
      setSecurityStatus(
        error?.message || "We couldn't change the password. Please try again.",
        true,
      );
    } finally {
      save.disabled = false;
      password.disabled = false;
      confirmPassword.disabled = false;
    }
  });
}

function setupDeleteAccount() {
  const openButton = document.querySelector("#settings-delete-account-button");
  const dialog = document.querySelector("#settings-delete-dialog");
  const input = document.querySelector("#settings-delete-confirmation");
  const cancel = document.querySelector("#settings-delete-cancel");
  const confirm = document.querySelector("#settings-delete-confirm-button");

  if (!openButton || !dialog || !input || !cancel || !confirm) return;

  function resetDialog() {
    input.value = "";
    confirm.disabled = true;
    setDeleteStatus("");
  }

  openButton.addEventListener("click", () => {
    if (openButton.disabled) return;
    resetDialog();
    if (typeof dialog.showModal === "function") {
      openDialogWithoutMobileKeyboard(dialog, input);
    }
  });

  cancel.addEventListener("click", () => dialog.close());

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  dialog.addEventListener("close", resetDialog);

  input.addEventListener("input", () => {
    confirm.disabled = input.value.trim() !== "DELETE";
    setDeleteStatus("");
  });

  confirm.addEventListener("click", async () => {
    if (input.value.trim() !== "DELETE" || confirm.disabled) return;

    confirm.disabled = true;
    cancel.disabled = true;
    input.disabled = true;
    setDeleteStatus("Deleting your account…");

    try {
      const { data, error } = await uiOriSupabase.functions.invoke("delete-account", {
        body: { confirm: "DELETE" },
      });
      if (error || !data?.ok) {
        const wrapped = new Error(data?.error || error?.message || "Delete failed");
        wrapped.code = data?.error || "delete_failed";
        throw wrapped;
      }

      try {
        await uiOriSupabase.auth.signOut({ scope: "local" });
      } catch (signOutError) {
        console.warn("[UIORI] local sign-out after deletion failed", signOutError);
      }

      window.location.replace("/?account=deleted");
    } catch (error) {
      console.error("[UIORI] account deletion failed", error);
      const code = error?.code || error?.message || "";
      if (String(code).includes("balance_exists")) {
        setDeleteStatus("Withdraw your remaining credited balance before deleting the account.", true);
      } else if (String(code).includes("withdrawal_in_progress")) {
        setDeleteStatus("Resolve or cancel the open withdrawal before deleting the account.", true);
      } else {
        setDeleteStatus("We couldn't delete the account. Please try again.", true);
      }
      confirm.disabled = input.value.trim() !== "DELETE";
      cancel.disabled = false;
      input.disabled = false;
    }
  });
}

document.addEventListener("uiori:account-state", (event) => {
  if (event.detail?.state === "anonymous") return;
  hydrate(event.detail.identity);
});

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("#settings-profile-form");
  const save = document.querySelector("#settings-save-button");

  initCustomSelects();
  setupPasswordChange();
  setupPayoutSettings();
  setupDeleteAccount();
  window.setTimeout(loadPayoutSettings, 0);

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const fullName = document.querySelector("#settings-name")?.value.trim() || "";
    const email = document.querySelector("#settings-email")?.value.trim() || "";
    if (!fullName || !email) {
      setStatus("Name and email are required.", true);
      return;
    }

    save.disabled = true;
    setStatus("Saving…");
    try {
      const user = await currentUser();

      const { error: profileError } = await uiOriSupabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("id", user.id);
      if (profileError) throw profileError;

      if (email.toLowerCase() !== String(user.email || "").toLowerCase()) {
        const { error: emailError } = await uiOriSupabase.auth.updateUser({ email });
        if (emailError) throw emailError;
        setStatus("Name saved. Check your email to confirm the address change.");
      } else {
        setStatus("Changes saved.");
      }

      window.UIORIAccess?.refresh?.();
    } catch (error) {
      console.error("[UIORI] settings save failed", error);
      setStatus("We couldn't save these changes. Please try again.", true);
    } finally {
      save.disabled = false;
    }
  });

});

uiOriSupabase.auth.onAuthStateChange((event) => {
  if (event !== "PASSWORD_RECOVERY") return;
  setSecurityStatus("Reset link verified. Choose a new password.", false, true);
  focusPasswordField();
});
