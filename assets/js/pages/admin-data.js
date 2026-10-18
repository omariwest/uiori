import "./admin-auth.js";
import "../components/app-navigation.js";
import { initCustomSelects } from "../components/custom-select.js";
import { uiOriAdminSupabase } from "../lib/supabase-client.js";

initCustomSelects();

const state = {
  users: [],
  withdrawals: [],
  reviews: [],
  selectedWithdrawal: null,
  selectedUser: null,
  selectedReview: null,
};


function openAdminOperationDrawer(drawer, focusSelector = "") {
  if (!drawer) return;
  document.querySelectorAll(".admin-operation-drawer.is-open").forEach((item) => {
    if (item !== drawer) closeAdminOperationDrawer(item);
  });
  drawer.classList.add("is-open");
  drawer.setAttribute("aria-hidden", "false");
  document.body.classList.add("admin-operation-drawer-open");
  window.setTimeout(() => {
    const mobileOrTouch = window.matchMedia("(max-width: 760px), (pointer: coarse)").matches;
    const target = mobileOrTouch
      ? drawer.querySelector('button[aria-label^="Close"]')
      : focusSelector
        ? drawer.querySelector(focusSelector)
        : drawer.querySelector("input, textarea, select, button");
    target?.focus({ preventScroll: true });
  }, 220);
}

function closeAdminOperationDrawer(drawer) {
  if (!drawer) return;
  drawer.classList.remove("is-open");
  drawer.setAttribute("aria-hidden", "true");
  if (!document.querySelector(".admin-operation-drawer.is-open")) {
    document.body.classList.remove("admin-operation-drawer-open");
  }
}

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const drawer = document.querySelector(".admin-operation-drawer.is-open");
  if (drawer) closeAdminOperationDrawer(drawer);
});

function money(cents) {
  const amount = (Number(cents) || 0) / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function integer(value) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    Number(value) || 0,
  );
}

function shortDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = String(value);
}

function clearAdminError() {
  document.querySelector(".admin-error-message")?.remove();
}

function showAdminError(message) {
  clearAdminError();
  const topbar = document.querySelector(".admin-topbar");
  if (!topbar) return;
  const alert = document.createElement("p");
  alert.className = "admin-error-message";
  alert.setAttribute("role", "alert");
  alert.textContent = message;
  topbar.insertAdjacentElement("afterend", alert);
}

function statusMarkup(label, className = "") {
  return `<span class="admin-status ${className}"><i></i>${label}</span>`;
}

function withdrawalStatusMarkup(label, className = "") {
  return `<span class="admin-withdrawal-status ${className}"><i></i>${label}</span>`;
}

function reviewStatusMarkup(label, className = "") {
  return `<span class="admin-review-state ${className}"><i></i>${label}</span>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function fetchAdminData(scope) {
  const { data, error } = await uiOriAdminSupabase.functions.invoke("admin-data", {
    body: { scope },
  });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || "Unable to load admin data.");
  return data;
}

function renderOverview(data) {
  const metrics = Array.from(document.querySelectorAll(".admin-metrics .admin-metric strong"));
  const values = [
    integer(data.summary?.total_users),
    integer(data.summary?.earning_active),
    money(data.summary?.credited_earnings_cents),
    integer(data.summary?.pending_withdrawals),
    integer(data.summary?.accounts_under_review),
  ];
  metrics.forEach((element, index) => {
    if (values[index] !== undefined) element.textContent = values[index];
  });

  const queueCounts = document.querySelectorAll(".admin-queue-heading > strong");
  if (queueCounts[0]) queueCounts[0].textContent = integer(data.summary?.pending_withdrawals);
  if (queueCounts[1]) queueCounts[1].textContent = integer(data.summary?.accounts_under_review);

  const queueEmpty = document.querySelectorAll(".admin-queue-empty span");
  if (queueEmpty[0]) {
    queueEmpty[0].textContent = data.summary?.pending_withdrawals
      ? `${integer(data.summary.pending_withdrawals)} request${Number(data.summary.pending_withdrawals) === 1 ? "" : "s"} waiting`
      : "No pending withdrawals";
  }
  if (queueEmpty[1]) {
    queueEmpty[1].textContent = data.summary?.accounts_under_review
      ? `${integer(data.summary.accounts_under_review)} account${Number(data.summary.accounts_under_review) === 1 ? "" : "s"} requiring attention`
      : "No accounts require review";
  }

  const platformRows = Array.from(document.querySelectorAll(".admin-platform-list > div"));
  const platformValues = [
    ["Active", true],
    [data.platform?.earning_connection === "ready" ? "Ready" : "Not connected", true],
    [data.platform?.withdrawals === "ready" ? "Ready" : "Not configured", true],
    [data.platform?.backend === "connected" ? "Connected" : "Not connected", true],
  ];
  platformRows.forEach((row, index) => {
    const dd = row.querySelector("dd");
    const dot = row.querySelector(".admin-status-dot");
    if (!dd || !platformValues[index]) return;
    const [label, active] = platformValues[index];
    dd.lastChild.textContent = ` ${label}`;
    if (dot) dot.classList.toggle("is-active", active);
  });
}

function accountStatus(user) {
  if (user.account_status === "restricted") return ["Restricted", "is-restricted"];
  if (user.account_status === "active") return ["Active", "is-active"];
  return ["Inactive", "is-pending"];
}

function earningLabel(status) {
  if (status === "active") return "Active";
  if (status === "pending") return "Pending";
  if (status === "paused") return "Paused";
  return "Not connected";
}

function reviewLabel(user) {
  if (user.review_status === "restricted") return ["Restricted", "is-restricted"];
  if (user.review_status === "open") return ["Needs review", "is-review"];
  return ["Clear", ""];
}

function filteredUsers() {
  const query = document.querySelector("#admin-user-search")?.value.trim().toLowerCase() || "";
  const status = document.querySelector("#admin-user-status")?.value || "all";
  const earning = document.querySelector("#admin-user-earning")?.value || "all";
  const review = document.querySelector("#admin-user-review")?.value || "all";

  return state.users.filter((user) => {
    const haystack = `${user.full_name} ${user.email}`.toLowerCase();
    if (query && !haystack.includes(query)) return false;
    if (status !== "all" && user.account_status !== status) return false;
    if (earning === "connected" && user.earning_status !== "active") return false;
    if (earning === "not-connected" && user.earning_status === "active") return false;
    if (review === "review" && user.review_status === "clear") return false;
    if (review === "clear" && user.review_status !== "clear") return false;
    return true;
  });
}

function renderUserRows() {
  const tbody = document.querySelector(".admin-users-table tbody");
  const count = document.querySelector(".admin-users-table-heading > span");
  if (!tbody) return;
  const users = filteredUsers();
  if (count) count.textContent = `${integer(users.length)} record${users.length === 1 ? "" : "s"}`;

  if (!users.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="admin-table-empty">No users match the current filters.</td></tr>`;
    return;
  }

  tbody.innerHTML = users
    .map((user) => {
      const [accountLabel, accountClass] = accountStatus(user);
      const [reviewText, reviewClass] = reviewLabel(user);
      return `<tr data-user-id="${escapeHtml(user.id)}">
        <th scope="row"><strong>${escapeHtml(user.full_name)}</strong><span>${escapeHtml(user.email)}</span></th>
        <td>${statusMarkup(accountLabel, accountClass)}</td>
        <td>${escapeHtml(earningLabel(user.earning_status))}</td>
        <td>${integer(user.points)}</td>
        <td>${money(user.available_cents)}</td>
        <td>${statusMarkup(reviewText, reviewClass)}</td>
        <td><time>${escapeHtml(shortDate(user.joined_at))}</time></td>
        <td>${
          user.review_status === "clear"
            ? `<button class="admin-table-action" data-user-review="${escapeHtml(user.id)}" type="button">Review <span aria-hidden="true">→</span></button>`
            : `<button class="admin-table-action" data-user-review-existing="${escapeHtml(user.email)}" type="button">Open <span aria-hidden="true">→</span></button>`
        }</td>
      </tr>`;
    })
    .join("");
}


function setUserReviewMessage(message, error = false) {
  const element = document.querySelector("#admin-user-review-message");
  if (!element) return;
  element.textContent = message || "";
  element.classList.toggle("is-error", error);
}

function setupUserReviewDialog() {
  const dialog = document.querySelector("#admin-user-review-dialog");
  const close = document.querySelector("#admin-user-review-close");
  const cancel = document.querySelector("#admin-user-review-cancel");
  const submit = document.querySelector("#admin-user-review-submit");
  if (!dialog || !close || !cancel || !submit) return;

  document.addEventListener("click", (event) => {
    const existing = event.target.closest("[data-user-review-existing]");
    if (existing) {
      const target = new URL("/admin/reviews/", window.location.origin);
      target.searchParams.set("q", existing.dataset.userReviewExisting || "");
      window.location.assign(target.toString());
      return;
    }

    const trigger = event.target.closest("[data-user-review]");
    if (!trigger) return;
    const user = state.users.find((item) => item.id === trigger.dataset.userReview);
    if (!user) return;

    state.selectedUser = user;
    setText("#admin-user-review-name", user.full_name || "UIORI member");
    setText("#admin-user-review-email", user.email || "—");
    setText("#admin-user-review-state", user.account_status === "active" ? "Active" : user.account_status === "restricted" ? "Restricted" : "Pending");
    const reason = document.querySelector("#admin-user-review-reason");
    const type = document.querySelector("#admin-user-review-type");
    const priority = document.querySelector("#admin-user-review-priority");
    if (reason) reason.value = "";
    if (type) {
      type.value = "account";
      type.dispatchEvent(new Event("change", { bubbles: true }));
    }
    if (priority) {
      priority.value = "standard";
      priority.dispatchEvent(new Event("change", { bubbles: true }));
    }
    setUserReviewMessage("");
    submit.disabled = false;
    openAdminOperationDrawer(dialog, "#admin-user-review-reason");
  });

  const closeDialog = () => {
    state.selectedUser = null;
    closeAdminOperationDrawer(dialog);
  };
  close.addEventListener("click", closeDialog);
  cancel.addEventListener("click", closeDialog);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeDialog();
  });

  submit.addEventListener("click", async () => {
    const user = state.selectedUser;
    if (!user || submit.disabled) return;

    const reason = document.querySelector("#admin-user-review-reason")?.value.trim() || "";
    const reviewType = document.querySelector("#admin-user-review-type")?.value || "account";
    const priority = document.querySelector("#admin-user-review-priority")?.value || "standard";

    if (!reason) {
      setUserReviewMessage("Enter a reason before opening the review.", true);
      return;
    }

    submit.disabled = true;
    setUserReviewMessage("Opening account review…");

    try {
      const { data, error } = await uiOriAdminSupabase.functions.invoke("admin-review", {
        body: {
          action: "create",
          user_id: user.id,
          reason,
          review_type: reviewType,
          priority,
        },
      });

      if (error || !data?.ok) {
        const code = data?.error || error?.message || "review_create_failed";
        if (code === "active_review_exists") {
          setUserReviewMessage("This account already has an active review.", true);
        } else {
          throw new Error(code);
        }
        return;
      }

      setUserReviewMessage("Review opened.");
      const refreshed = await fetchAdminData("users");
      renderUsers(refreshed);
      window.setTimeout(closeDialog, 650);
    } catch (error) {
      console.error("[UIORI] opening review failed", error);
      setUserReviewMessage("The review could not be opened. Refresh and try again.", true);
    } finally {
      submit.disabled = false;
    }
  });
}

function renderUsers(data) {
  state.users = data.users || [];
  const cards = document.querySelectorAll(".admin-users-summary strong");
  if (cards[0]) cards[0].textContent = integer(data.summary?.total_users);
  if (cards[1]) cards[1].textContent = integer(data.summary?.connected_users);
  if (cards[2]) cards[2].textContent = integer(data.summary?.accounts_under_review);
  if (cards[3]) cards[3].textContent = integer(data.summary?.restricted_users);
  renderUserRows();

  ["#admin-user-search", "#admin-user-status", "#admin-user-earning", "#admin-user-review"].forEach((selector) => {
    const control = document.querySelector(selector);
    if (!control || control.dataset.uioriFilterReady === "true") return;
    control.dataset.uioriFilterReady = "true";
    control.addEventListener(control.matches("input") ? "input" : "change", renderUserRows);
  });
}

function filteredWithdrawals() {
  const query = document.querySelector("#withdrawal-search")?.value.trim().toLowerCase() || "";
  const status = document.querySelector("#withdrawal-status")?.value || "all";
  const eligibility = document.querySelector("#withdrawal-eligibility")?.value || "all";
  return state.withdrawals.filter((row) => {
    const haystack = `${row.user_name} ${row.user_email}`.toLowerCase();
    if (query && !haystack.includes(query)) return false;
    if (status === "review" && !(row.status === "pending" && row.eligibility === "review")) return false;
    if (status !== "all" && status !== "review" && row.status !== status) return false;
    if (eligibility !== "all" && row.eligibility !== eligibility) return false;
    return true;
  });
}

function renderWithdrawalRows() {
  const tbody = document.querySelector(".admin-withdrawals-table tbody");
  const count = document.querySelector(".admin-withdrawals-table-heading > span");
  if (!tbody) return;
  const rows = filteredWithdrawals();
  if (count) count.textContent = `${integer(rows.length)} record${rows.length === 1 ? "" : "s"}`;
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="admin-table-empty">No withdrawal requests match the current filters.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map((row) => {
    const eligibility = row.eligibility === "eligible"
      ? withdrawalStatusMarkup("Eligible", "is-eligible")
      : withdrawalStatusMarkup("Needs review", "is-review");
    const statusClass = row.status === "approved" || row.status === "paid"
      ? "is-eligible"
      : row.status === "rejected" || row.status === "cancelled"
        ? "is-rejected"
        : row.eligibility === "review" ? "is-review" : "is-pending";
    const statusText = row.status === "paid" ? "Paid" : row.status[0].toUpperCase() + row.status.slice(1);
    return `<tr>
      <th scope="row"><strong>${escapeHtml(row.user_name)}</strong><span>${escapeHtml(row.user_email)}</span></th>
      <td>${money(row.available_cents)}</td>
      <td>${money(row.amount_cents)}</td>
      <td>${eligibility}</td>
      <td>${withdrawalStatusMarkup(statusText, statusClass)}</td>
      <td><time>${escapeHtml(shortDate(row.requested_at))}</time></td>
      <td><button class="admin-withdrawal-action admin-withdrawal-review-button" data-withdrawal-review="${escapeHtml(row.id)}" type="button">Review</button></td>
    </tr>`;
  }).join("");
}

function setWithdrawalReviewMessage(message, error = false) {
  const element = document.querySelector("#admin-withdrawal-review-message");
  if (!element) return;
  element.textContent = message || "";
  element.classList.toggle("is-error", error);
}

function populateWithdrawalDialog(row) {
  const dialog = document.querySelector("#admin-withdrawal-dialog");
  if (!dialog || !row) return;
  state.selectedWithdrawal = row;

  setText("#admin-withdrawal-review-user", row.user_name || "Unknown user");
  setText("#admin-withdrawal-review-email", row.user_email || "—");
  setText("#admin-withdrawal-review-amount", money(row.amount_cents));
  setText("#admin-withdrawal-review-network", row.payout_asset && row.payout_network ? `${row.payout_asset} · ${row.payout_network}` : "Not available");
  setText("#admin-withdrawal-review-address", row.payout_destination_snapshot || "—");
  setText("#admin-withdrawal-review-status", row.status ? row.status[0].toUpperCase() + row.status.slice(1) : "—");

  const transaction = document.querySelector("#admin-withdrawal-transaction");
  const note = document.querySelector("#admin-withdrawal-note");
  if (transaction) transaction.value = row.transaction_ref || "";
  if (note) note.value = row.admin_note || "";
  setWithdrawalReviewMessage("");

  dialog.querySelectorAll("[data-withdrawal-action]").forEach((button) => {
    const action = button.dataset.withdrawalAction;
    button.disabled =
      (action === "approve" && row.status !== "pending") ||
      (action === "reject" && !["pending", "approved"].includes(row.status)) ||
      (action === "paid" && row.status !== "approved");
  });

  openAdminOperationDrawer(dialog, "#admin-withdrawal-transaction");
}

async function refreshWithdrawals() {
  const data = await fetchAdminData("withdrawals");
  renderWithdrawals(data);
  return data;
}

function setupWithdrawalReviewDialog() {
  const dialog = document.querySelector("#admin-withdrawal-dialog");
  const close = document.querySelector("#admin-withdrawal-review-close");
  if (!dialog || !close) return;

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-withdrawal-review]");
    if (!trigger) return;
    const row = state.withdrawals.find((item) => item.id === trigger.dataset.withdrawalReview);
    if (row) populateWithdrawalDialog(row);
  });

  close.addEventListener("click", () => closeAdminOperationDrawer(dialog));
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeAdminOperationDrawer(dialog);
  });

  dialog.querySelectorAll("[data-withdrawal-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      const row = state.selectedWithdrawal;
      if (!row || button.disabled) return;
      const action = button.dataset.withdrawalAction;
      const transactionRef = document.querySelector("#admin-withdrawal-transaction")?.value.trim() || "";
      const adminNote = document.querySelector("#admin-withdrawal-note")?.value.trim() || "";

      if (action === "paid" && !transactionRef) {
        setWithdrawalReviewMessage("Enter the payout transaction reference before marking this request paid.", true);
        return;
      }

      dialog.querySelectorAll("[data-withdrawal-action]").forEach((item) => { item.disabled = true; });
      setWithdrawalReviewMessage(action === "paid" ? "Recording payout…" : action === "approve" ? "Approving request…" : "Rejecting request…");

      try {
        const { data, error } = await uiOriAdminSupabase.functions.invoke("admin-withdrawal", {
          body: {
            request_id: row.id,
            action,
            transaction_ref: transactionRef || null,
            admin_note: adminNote || null,
          },
        });
        if (error || !data?.ok) {
          const wrapped = new Error(data?.error || error?.message || "withdrawal_action_failed");
          wrapped.code = data?.error || "withdrawal_action_failed";
          throw wrapped;
        }

        setWithdrawalReviewMessage(action === "paid" ? "Payout marked paid." : action === "approve" ? "Withdrawal approved." : "Withdrawal rejected and reserved balance returned.");
        await refreshWithdrawals();
        window.setTimeout(() => closeAdminOperationDrawer(dialog), 700);
      } catch (error) {
        console.error("[UIORI] admin withdrawal action failed", error);
        setWithdrawalReviewMessage("The withdrawal could not be updated. Refresh and try again.", true);
        populateWithdrawalDialog(state.selectedWithdrawal);
      }
    });
  });
}

function renderWithdrawals(data) {
  state.withdrawals = data.withdrawals || [];
  const summary = data.withdrawal_summary || {};
  const cards = document.querySelectorAll(".admin-withdrawals-summary strong");
  if (cards[0]) cards[0].textContent = integer(summary.pending);
  if (cards[1]) cards[1].textContent = integer(summary.under_review);
  if (cards[2]) cards[2].textContent = integer(summary.approved);
  if (cards[3]) cards[3].textContent = money(summary.total_requested_cents);
  renderWithdrawalRows();

  ["#withdrawal-search", "#withdrawal-status", "#withdrawal-eligibility"].forEach((selector) => {
    const control = document.querySelector(selector);
    if (!control || control.dataset.uioriFilterReady === "true") return;
    control.dataset.uioriFilterReady = "true";
    control.addEventListener(control.matches("input") ? "input" : "change", renderWithdrawalRows);
  });
}

function reviewTypeLabel(value) {
  if (value === "withdrawal") return "Withdrawal";
  if (value === "reward") return "Reward activity";
  return "Account integrity";
}

function filteredReviews() {
  const query = document.querySelector("#review-search")?.value.trim().toLowerCase() || "";
  const type = document.querySelector("#review-type")?.value || "all";
  const priority = document.querySelector("#review-priority")?.value || "all";
  const status = document.querySelector("#review-status")?.value || "all";
  return state.reviews.filter((row) => {
    const haystack = `${row.user_name} ${row.user_email} ${row.reason}`.toLowerCase();
    if (query && !haystack.includes(query)) return false;
    if (type !== "all" && row.review_type !== type) return false;
    if (priority !== "all" && row.priority !== priority) return false;
    if (status === "resolved" && row.status !== "cleared") return false;
    if (status === "investigating" && row.status !== "restricted") return false;
    if (status === "open" && row.status !== "open") return false;
    return true;
  });
}

function renderReviewRows() {
  const tbody = document.querySelector(".admin-reviews-table tbody");
  const count = document.querySelector(".admin-reviews-table-heading > span");
  if (!tbody) return;
  const rows = filteredReviews();
  if (count) count.textContent = `${integer(rows.length)} record${rows.length === 1 ? "" : "s"}`;
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="admin-table-empty">No account reviews match the current filters.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map((row) => {
    const priorityClass = row.priority === "high" ? "is-high" : "is-standard";
    const statusClass = row.status === "restricted" ? "is-investigating" : row.status === "open" ? "is-open" : "is-resolved";
    const statusText = row.status === "restricted" ? "Investigating" : row.status === "cleared" ? "Resolved" : "Open";
    return `<tr>
      <th scope="row"><strong>${escapeHtml(row.user_name)}</strong><span>${escapeHtml(row.user_email)}</span></th>
      <td class="admin-review-reason">${escapeHtml(row.reason || "Manual account review")}</td>
      <td>${escapeHtml(reviewTypeLabel(row.review_type))}</td>
      <td>${reviewStatusMarkup(row.priority === "high" ? "High" : "Standard", priorityClass)}</td>
      <td>${reviewStatusMarkup(statusText, statusClass)}</td>
      <td><time>${escapeHtml(shortDate(row.created_at))}</time></td>
      <td>${
        row.status === "cleared"
          ? `<span class="admin-review-action admin-table-action--static">Resolved</span>`
          : `<button class="admin-review-action" data-review-manage="${escapeHtml(row.id)}" type="button">Manage</button>`
      }</td>
    </tr>`;
  }).join("");
}


function setManageReviewMessage(message, error = false) {
  const element = document.querySelector("#admin-review-manage-message");
  if (!element) return;
  element.textContent = message || "";
  element.classList.toggle("is-error", error);
}

function setupReviewManageDialog() {
  const dialog = document.querySelector("#admin-review-manage-dialog");
  const close = document.querySelector("#admin-review-manage-close");
  if (!dialog || !close) return;

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-review-manage]");
    if (!trigger) return;
    const review = state.reviews.find((item) => item.id === trigger.dataset.reviewManage);
    if (!review) return;

    state.selectedReview = review;
    setText("#admin-review-manage-user", review.user_name || "Unknown user");
    setText("#admin-review-manage-email", review.user_email || "—");
    setText("#admin-review-manage-status", review.status === "restricted" ? "Restricted" : review.status === "cleared" ? "Resolved" : "Open");
    setText("#admin-review-manage-type", reviewTypeLabel(review.review_type));
    setText("#admin-review-manage-priority", review.priority === "high" ? "High" : "Standard");

    const reason = document.querySelector("#admin-review-manage-reason");
    const note = document.querySelector("#admin-review-manage-note");
    if (reason) reason.value = review.reason || "";
    if (note) note.value = review.admin_note || "";
    setManageReviewMessage("");

    dialog.querySelectorAll("[data-review-action]").forEach((button) => {
      button.disabled =
        review.status === "cleared" ||
        (button.dataset.reviewAction === "restrict" && review.status === "restricted");
    });

    openAdminOperationDrawer(dialog, "#admin-review-manage-note");
  });

  const closeDialog = () => {
    state.selectedReview = null;
    closeAdminOperationDrawer(dialog);
  };
  close.addEventListener("click", closeDialog);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeDialog();
  });

  dialog.querySelectorAll("[data-review-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      const review = state.selectedReview;
      if (!review || button.disabled) return;

      const action = button.dataset.reviewAction;
      const note = document.querySelector("#admin-review-manage-note")?.value.trim() || "";
      dialog.querySelectorAll("[data-review-action]").forEach((item) => { item.disabled = true; });
      setManageReviewMessage(action === "restrict" ? "Restricting account…" : "Clearing review…");

      try {
        const { data, error } = await uiOriAdminSupabase.functions.invoke("admin-review", {
          body: {
            action,
            review_id: review.id,
            admin_note: note || null,
          },
        });

        if (error || !data?.ok) throw new Error(data?.error || error?.message || "review_action_failed");

        setManageReviewMessage(action === "restrict" ? "Account restricted and earning paused." : "Review cleared.");
        const refreshed = await fetchAdminData("reviews");
        renderReviews(refreshed);
        window.setTimeout(closeDialog, 700);
      } catch (error) {
        console.error("[UIORI] review action failed", error);
        setManageReviewMessage("The review could not be updated. Refresh and try again.", true);
        button.disabled = false;
      }
    });
  });
}

function renderReviews(data) {
  state.reviews = data.reviews || [];
  const summary = data.review_summary || {};
  const cards = document.querySelectorAll(".admin-reviews-summary strong");
  if (cards[0]) cards[0].textContent = integer(summary.open);
  if (cards[1]) cards[1].textContent = integer(summary.withdrawal);
  if (cards[2]) cards[2].textContent = integer(summary.account);
  if (cards[3]) cards[3].textContent = integer(summary.resolved);
  renderReviewRows();

  ["#review-search", "#review-type", "#review-priority", "#review-status"].forEach((selector) => {
    const control = document.querySelector(selector);
    if (!control || control.dataset.uioriFilterReady === "true") return;
    control.dataset.uioriFilterReady = "true";
    control.addEventListener(control.matches("input") ? "input" : "change", renderReviewRows);
  });
}


function renderSettings(data) {
  const pool = data.reward_pool || {};
  const integrations = {
    supabase: ["Connected", "is-decided"],
    google: [
      data.auth?.google_enabled ? "OAuth ready" : "Needs setup",
      data.auth?.google_enabled ? "is-decided" : "is-planned",
    ],
    contact: [data.contact_delivery?.ready ? "Ready" : "SMTP secret pending", data.contact_delivery?.ready ? "is-decided" : "is-planned"],
    earning: [data.earning_provider?.ready ? "Ready" : "Support link pending", data.earning_provider?.ready ? "is-decided" : "is-planned"],
    payout: ["Ready", "is-decided"],
  };

  Object.entries(integrations).forEach(([key, [label, className]]) => {
    const element = document.querySelector(`[data-uiori-integration="${key}"]`);
    if (!element) return;
    element.classList.remove("is-decided", "is-planned");
    element.classList.add(className);
    const dot = element.querySelector("i");
    element.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) node.textContent = "";
    });
    if (dot) dot.insertAdjacentText("afterend", ` ${label}`);
  });

  const periodState = document.querySelector("[data-uiori-pool-periods]");
  const periodDetail = document.querySelector("[data-uiori-pool-detail]");
  const periodCount = Number(pool.period_count) || 0;

  if (periodState) {
    const dot = periodState.querySelector("i");
    periodState.classList.remove("is-decided", "is-planned");
    periodState.classList.add(periodCount > 0 ? "is-decided" : "is-planned");
    periodState.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) node.textContent = "";
    });
    if (dot) {
      dot.insertAdjacentText(
        "afterend",
        periodCount > 0
          ? ` ${integer(periodCount)} period${periodCount === 1 ? "" : "s"}`
          : " Waiting for provider",
      );
    }
  }

  if (periodDetail) {
    periodDetail.textContent = periodCount > 0
      ? `${money(pool.gross_revenue_cents)} funded revenue recorded; ${money(pool.user_pool_cents)} reserved for qualified users and ${money(pool.platform_share_cents)} reserved for UIORI.`
      : "No funded provider revenue has been recorded yet.";
  }
}

async function bootAdminData() {
  const path = window.location.pathname;
  let scope = "all";
  let renderer = renderOverview;

  if (path.startsWith("/admin/users")) {
    scope = "users";
    renderer = renderUsers;
  } else if (path.startsWith("/admin/withdrawals")) {
    scope = "withdrawals";
    renderer = renderWithdrawals;
  } else if (path.startsWith("/admin/reviews")) {
    scope = "reviews";
    renderer = renderReviews;
  } else if (path.startsWith("/admin/settings")) {
    scope = "settings";
    renderer = renderSettings;
  } else if (path !== "/admin/" && path !== "/admin/index.html") {
    return;
  }

  try {
    const data = await fetchAdminData(scope);
    clearAdminError();
    renderer(data);
  } catch (error) {
    console.error("[UIORI] admin data load failed", error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setupWithdrawalReviewDialog();
  setupUserReviewDialog();
  setupReviewManageDialog();

  const reviewQuery = new URLSearchParams(window.location.search).get("q");
  const reviewSearch = document.querySelector("#review-search");
  if (reviewQuery && reviewSearch) reviewSearch.value = reviewQuery;

  window.setTimeout(bootAdminData, 0);
});
