import { countries } from "../data/countries.js";
import { payouts } from "../data/payout-methods.js";
import { tasks } from "../data/task-types.js";
import { platforms } from "../data/platforms.js";

export function initRouteFinder() {
  document.querySelectorAll("[data-route-finder]").forEach((panel) => {
    const countryEl = panel.querySelector("[data-route-country]");
    const payoutEl = panel.querySelector("[data-route-payout]");
    const taskEl = panel.querySelector("[data-route-task]");
    const result = panel.querySelector("[data-route-result]");
    if (!countryEl || !payoutEl || !taskEl || !result) return;

    const update = () => {
      const country = countries.find((item) => item.slug === countryEl.value);
      const payout = payouts.find((item) => item.slug === payoutEl.value);
      const task = tasks.find((item) => item.slug === taskEl.value);

      if (!country) {
        result.innerHTML =
          "Choose your country first. Then we will suggest a safer first route based on payout method and task type.";
        return;
      }

      const matching = platforms
        .filter((platform) => {
          const inTask = task.platforms?.includes(platform.slug);
          const payoutWords = platform.payouts.join(" ").toLowerCase();
          const payoutMatch =
            payout.slug === "paypal"
              ? payoutWords.includes("paypal")
              : payout.slug === "payoneer"
                ? payoutWords.includes("payoneer") ||
                  payoutWords.includes("project")
                : payout.slug === "crypto"
                  ? payoutWords.includes("crypto")
                  : payout.slug === "gift-cards"
                    ? payoutWords.includes("gift")
                    : payout.slug === "bank-transfer"
                      ? payoutWords.includes("bank") ||
                        payoutWords.includes("sepa") ||
                        payoutWords.includes("project")
                      : false;
          return inTask || payoutMatch;
        })
        .slice(0, 3);

      const platformNames = matching.map((p) => p.name).join(", ");

      const platformChips = matching
        .map(
          (p) =>
            `<a class="route-platform-chip" href="/platforms/${p.slug}/">${p.name}</a>`,
        )
        .join("");

      result.innerHTML = `
          <div class="route-result-kicker">Best first route</div>
          <strong class="route-result-title">${country.name} + ${payout.name} + ${task.name}</strong>
          <p>Start with eligibility checks first. Then test ${platformNames || "one relevant platform"}. Do not scale until ${payout.name} payout is confirmed.</p>
          ${platformChips ? `<div class="route-platforms" aria-label="Suggested platforms">${platformChips}</div>` : ""}
          <p class="route-result-warning">Availability can change by country, profile, and platform rules.</p>
          <a class="route-result-cta" href="/today/${country.slug}/">View today options</a>
        `;
    };

    [countryEl, payoutEl, taskEl].forEach((el) =>
      el.addEventListener("change", update),
    );
    update();
  });
}
