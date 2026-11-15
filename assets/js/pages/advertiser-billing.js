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

function shortDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function formatAmount(value, asset = "USDT") {
  const amount = Number(value) || 0;
  return `${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 })} ${asset || "USDT"}`;
}

function humanStatus(status) {
  const map = {
    pending: "Pending",
    confirming: "Confirming",
    confirmed: "Confirmed",
    failed: "Failed",
    refunding: "Refunding",
    refunded: "Refunded",
  };
  return map[status] || status || "Unknown";
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

  const [profileResult, paymentsResult, campaignsResult] = await Promise.all([
    uiOriSupabase.from("profiles").select("full_name, avatar_path").eq("id", user.id).maybeSingle(),
    uiOriSupabase.from("payments")
      .select("id, campaign_id, amount, asset, network, status, transaction_ref, created_at, confirmed_at, refunded_at")
      .order("created_at", { ascending: false }),
    uiOriSupabase.from("campaigns").select("id, title"),
  ]);

  if (paymentsResult.error) throw paymentsResult.error;
  if (campaignsResult.error) throw campaignsResult.error;

  const profile = profileResult.data;
  const avatarUrl = profile?.avatar_path ? await getProfileAvatarUrl(profile.avatar_path) : "";
  setIdentity({ name: safeName(user, profile), avatarUrl });

  const campaignById = new Map((campaignsResult.data || []).map((row) => [row.id, row]));
  const payments = paymentsResult.data || [];
  const confirmed = payments.filter((row) => row.status === "confirmed");
  const confirmedAmount = confirmed.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);

  setText("[data-billing-payment-count]", payments.length);
  setText("[data-billing-confirmed-count]", confirmed.length);
  setText("[data-billing-confirmed-volume]", `${confirmedAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 })} USDT`);

  const tbody = document.querySelector("[data-billing-table-body]");
  const empty = document.querySelector("[data-billing-empty]");
  if (payments.length && tbody) {
    empty?.remove();
    tbody.replaceChildren(...payments.map((payment) => {
      const row = document.createElement("tr");
      const campaign = campaignById.get(payment.campaign_id);
      const tx = payment.transaction_ref || "—";
      row.innerHTML = `
        <th scope="row"><strong></strong><span></span></th>
        <td></td><td></td><td></td><td></td><td class="advertiser-billing-hash"></td>`;
      row.querySelector("th strong").textContent = campaign?.title || "Campaign payment";
      row.querySelector("th span").textContent = shortDate(payment.confirmed_at || payment.created_at);
      const cells = row.querySelectorAll("td");
      cells[0].textContent = formatAmount(payment.amount, payment.asset);
      cells[1].textContent = payment.network || "—";
      cells[2].innerHTML = `<span class="advertiser-billing-status is-${payment.status || "unknown"}"></span>`;
      cells[2].querySelector("span").textContent = humanStatus(payment.status);
      cells[3].textContent = shortDate(payment.refunded_at);
      cells[4].textContent = tx;
      cells[4].title = tx === "—" ? "" : tx;
      return row;
    }));
  }

  document.body.classList.remove("app-auth-loading");
}

wireLogout();
loadPage().catch((error) => {
  console.error("[UIORI] billing load failed", error);
  document.body.classList.remove("app-auth-loading");
});
