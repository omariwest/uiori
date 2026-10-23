import { uiOriSupabase } from "../lib/supabase-client.js";

let walletState = null;
let loading = false;

function money(cents) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format((Number(cents) || 0) / 100);
}

function dateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function setRequestStatus(message, error = false) {
  const element = document.querySelector("#wallet-request-status");
  if (!element) return;
  element.textContent = message || "";
  element.classList.toggle("is-error", error);
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

function eligibilityMessage(data) {
  if (data.open_withdrawal?.status === "pending") return "Pending review";
  if (data.open_withdrawal?.status === "approved") return "Approved for payout";
  if (data.eligible) return "Eligible to withdraw";
  const checks = data.checks || {};
  if (!checks.sufficient_balance) return `Minimum ${money(data.rules?.minimum_withdrawal_cents || 500)} balance`;
  if (!checks.payout_configured) return "Add payout destination";
  if (!checks.payout_ready) return "Payout safety period active";
  if (!checks.account_age) return "Account age requirement pending";
  if (!checks.email_verified) return "Verify your email";
  if (!checks.active_account) return "Activate earning first";
  if (!checks.account_clear) return "Account review required";
  if (!checks.no_open_withdrawal) return "Existing withdrawal in progress";
  return "Not yet eligible";
}

function setRequirement(name, met) {
  const row = document.querySelector(`[data-wallet-requirement="${name}"]`);
  row?.classList.toggle("is-met", Boolean(met));
}

function renderWalletStatus(data) {
  walletState = data;
  const status = document.querySelector("[data-uiori-withdrawal-status]");
  const button = document.querySelector("#wallet-withdraw-button");
  const note = document.querySelector("[data-uiori-wallet-note]");
  const payoutTitle = document.querySelector("[data-uiori-payout-title]");
  const payoutCopy = document.querySelector("[data-uiori-payout-copy]");

  if (status) status.textContent = eligibilityMessage(data);

  if (note) {
    note.textContent = `${money(data.rules?.minimum_withdrawal_cents || 500)} minimum · ${data.rules?.payout_batch === "monthly" ? "Monthly payout processing" : "Payout processing"}`;
  }

  const open = data.open_withdrawal;
  if (button) {
    button.dataset.mode = "request";
    button.disabled = true;
    button.textContent = "Request withdrawal";

    if (open?.status === "pending") {
      button.dataset.mode = "cancel";
      button.disabled = false;
      button.textContent = "Cancel pending request";
    } else if (open?.status === "approved") {
      button.textContent = "Approved for payout";
    } else if (data.eligible) {
      button.disabled = false;
    }
    button.setAttribute("aria-disabled", String(button.disabled));
  }

  const checks = data.checks || {};
  setRequirement("balance", checks.sufficient_balance);
  setRequirement("account", checks.active_account && checks.email_verified && checks.account_clear);
  setRequirement("age", checks.account_age && checks.payout_configured && checks.payout_ready);
  setRequirement("request", checks.no_open_withdrawal);

  if (payoutTitle && payoutCopy) {
    if (data.destination) {
      const networkLabel = data.destination.network === "BEP20"
        ? "BNB Smart Chain"
        : data.destination.network;
      payoutTitle.textContent = `${data.destination.asset} · ${networkLabel}`;
      const readyAt = data.destination.ready_at ? new Date(data.destination.ready_at) : null;
      const waiting = readyAt && readyAt.getTime() > Date.now();
      payoutCopy.textContent = waiting
        ? `${data.destination.masked_address} · Available for new requests after ${dateTime(data.destination.ready_at)}.`
        : `${data.destination.masked_address} · Ready for eligible withdrawals.`;
    } else {
      payoutTitle.textContent = "Not configured";
      payoutCopy.textContent = "Add a USDT payout destination before your first eligible withdrawal.";
    }
  }
}

async function loadWalletStatus() {
  if (loading || window.UIORIAccess?.state !== "active") return;
  loading = true;
  try {
    const data = await invokeWallet({ action: "status" });
    renderWalletStatus(data);
  } catch (error) {
    console.error("[UIORI] wallet status failed", error);
    const status = document.querySelector("[data-uiori-withdrawal-status]");
    if (status) status.textContent = "Unable to check eligibility";
  } finally {
    loading = false;
  }
}

function friendlyError(code) {
  const messages = {
    below_minimum: "The amount is below the minimum withdrawal.",
    account_too_new: "Your account has not reached the minimum age yet.",
    account_review: "This account currently requires review.",
    payout_not_configured: "Add a payout destination before requesting a withdrawal.",
    payout_cooldown: "Your payout destination is still inside the 24-hour safety period.",
    open_withdrawal_exists: "You already have an open withdrawal request.",
    insufficient_balance: "That amount is higher than your available credited balance.",
    account_not_active: "Activate earning before requesting a withdrawal.",
    email_not_verified: "Verify your email before requesting a withdrawal.",
    invalid_amount: "Enter a valid withdrawal amount.",
    cannot_cancel: "This request can no longer be cancelled.",
  };
  return messages[code] || "We couldn't complete that request. Please try again.";
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

function setupWithdrawalDialog() {
  const openButton = document.querySelector("#wallet-withdraw-button");
  const dialog = document.querySelector("#wallet-request-dialog");
  const close = document.querySelector("#wallet-request-close");
  const submit = document.querySelector("#wallet-request-submit");
  const input = document.querySelector("#wallet-request-amount");
  const useAll = document.querySelector("#wallet-request-all");
  const balance = document.querySelector("#wallet-request-balance");
  const intro = document.querySelector("#wallet-request-intro");
  const field = input?.closest(".wallet-request-field");
  const note = dialog?.querySelector(".wallet-request-note");

  if (!openButton || !dialog || !close || !submit || !input || !useAll || !balance || !intro || !field || !note) return;

  function reset() {
    setRequestStatus("");
    input.value = "";
    input.disabled = false;
    submit.disabled = false;
    close.disabled = false;
  }

  function openRequest() {
    if (!walletState) return;
    reset();
    const mode = openButton.dataset.mode || "request";
    dialog.dataset.mode = mode;
    balance.textContent = money(walletState.balance_cents);

    if (mode === "cancel") {
      const request = walletState.open_withdrawal;
      intro.textContent = `Your ${money(request?.amount_cents)} request is still pending review. Cancelling it returns the reserved amount to your available balance.`;
      field.hidden = true;
      useAll.hidden = true;
      note.hidden = true;
      submit.textContent = "Cancel withdrawal request";
    } else {
      intro.textContent = "Choose how much of your available credited balance you want to request.";
      field.hidden = false;
      useAll.hidden = false;
      note.hidden = false;
      const minimum = Number(walletState.rules?.minimum_withdrawal_cents) || 500;
      input.min = String(minimum / 100);
      input.max = String((Number(walletState.balance_cents) || 0) / 100);
      input.value = ((Number(walletState.balance_cents) || 0) / 100).toFixed(2);
      submit.textContent = "Request withdrawal";
    }

    openDialogWithoutMobileKeyboard(dialog, mode === "request" ? input : null);
  }

  openButton.addEventListener("click", () => {
    if (!openButton.disabled) openRequest();
  });
  close.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", reset);
  useAll.addEventListener("click", () => {
    input.value = ((Number(walletState?.balance_cents) || 0) / 100).toFixed(2);
    input.focus();
  });

  submit.addEventListener("click", async () => {
    if (!walletState || submit.disabled) return;
    submit.disabled = true;
    close.disabled = true;
    input.disabled = true;

    try {
      if (dialog.dataset.mode === "cancel") {
        setRequestStatus("Cancelling request…");
        await invokeWallet({ action: "cancel", request_id: walletState.open_withdrawal?.id });
        setRequestStatus("Withdrawal request cancelled. The reserved amount is back in your balance.");
      } else {
        const amount = Number(input.value);
        const amountCents = Math.round(amount * 100);
        if (!Number.isFinite(amount) || amount <= 0 || amountCents > Number(walletState.balance_cents)) {
          throw Object.assign(new Error("invalid_amount"), { code: "invalid_amount" });
        }
        setRequestStatus("Reserving balance and creating your request…");
        await invokeWallet({ action: "request", amount_cents: amountCents });
        setRequestStatus("Withdrawal request created successfully.");
      }

      await loadWalletStatus();
      window.UIORIProgress?.refresh?.();
      window.setTimeout(() => dialog.close(), 850);
    } catch (error) {
      console.error("[UIORI] wallet action failed", error);
      setRequestStatus(friendlyError(error.code || error.message), true);
      submit.disabled = false;
      close.disabled = false;
      input.disabled = false;
    }
  });
}

document.addEventListener("uiori:account-state", (event) => {
  if (event.detail?.state === "active") window.setTimeout(loadWalletStatus, 0);
});

document.addEventListener("DOMContentLoaded", () => {
  setupWithdrawalDialog();
  window.setTimeout(loadWalletStatus, 0);
});
