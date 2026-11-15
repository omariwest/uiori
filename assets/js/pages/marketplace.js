const channels = [
  {
    priority: 1,
    name: "Crypto Airdrops & Apps",
    initials: "CA",
    category: "airdrops",
    region: "global",
    language: "english",
    audience: "Global English",
    topicLabel: "Airdrops",
    regionLabel: "Global",
    languageLabel: "English",
    description:
      "Crypto opportunities, Web3 apps, testnets, and quests with clear cost, KYC, region, and source labels.",
  },
  {
    priority: 2,
    name: "Crypto News & Alerts",
    initials: "CN",
    category: "news",
    region: "global",
    language: "english",
    audience: "Global English",
    topicLabel: "Crypto news",
    regionLabel: "Global",
    languageLabel: "English",
    description:
      "Filtered crypto news, regulation, security incidents, and high-impact alerts without headline overload.",
  },
  {
    priority: 3,
    name: "TON Mini Apps & Bots",
    initials: "TM",
    category: "mini-apps",
    region: "global",
    language: "english",
    audience: "Telegram-native",
    topicLabel: "Mini Apps & bots",
    regionLabel: "Global",
    languageLabel: "English",
    description:
      "Discovery and practical coverage of TON Mini Apps, Telegram bots, and Telegram-native tools.",
  },
  {
    priority: 4,
    name: "Crypto Tools & AI",
    initials: "CT",
    category: "tools",
    region: "global",
    language: "english",
    audience: "Global English",
    topicLabel: "Tools & AI",
    regionLabel: "Global",
    languageLabel: "English",
    description:
      "Useful crypto analytics, AI tools, trackers, security products, and productivity utilities.",
  },
  {
    priority: 5,
    name: "Crypto Memes & News",
    initials: "CM",
    category: "memes",
    region: "global",
    language: "english",
    audience: "Global English",
    topicLabel: "Memes & culture",
    regionLabel: "Global",
    languageLabel: "English",
    description:
      "Shareable crypto culture, original or credited memes, polls, and short news context.",
  },
  {
    priority: 6,
    name: "Crypto Wallets & Stablecoins",
    initials: "CW",
    category: "wallets",
    region: "global",
    language: "english",
    audience: "Global / emerging markets",
    topicLabel: "Wallets & stablecoins",
    regionLabel: "Global",
    languageLabel: "English",
    description:
      "Wallets, stablecoins, payments, cross-border tools, security, and important scam alerts.",
  },
  {
    priority: 7,
    name: "Crypto India | Airdrops & Apps",
    initials: "IN",
    category: "airdrops",
    region: "india",
    language: "english",
    audience: "India",
    topicLabel: "Airdrops",
    regionLabel: "India",
    languageLabel: "English",
    description:
      "Crypto opportunities, apps, Mini Apps, KYC, and region-specific information for Indian users.",
  },
  {
    priority: 8,
    name: "Airdrop Indonesia | Crypto Apps",
    initials: "ID",
    category: "airdrops",
    region: "indonesia",
    language: "bahasa-indonesia",
    audience: "Indonesia",
    topicLabel: "Airdrops",
    regionLabel: "Indonesia",
    languageLabel: "Bahasa Indonesia",
    description:
      "Airdrops, Web3 apps, testnets, and practical crypto opportunities localized for Indonesia.",
  },
  {
    priority: 9,
    name: "Nigeria Crypto | News & Airdrops",
    initials: "NG",
    category: "news",
    region: "nigeria",
    language: "english",
    audience: "Nigeria",
    topicLabel: "News & airdrops",
    regionLabel: "Nigeria",
    languageLabel: "English",
    description:
      "Crypto news, airdrops, apps, stablecoin, and payment developments relevant to Nigerian users.",
  },
  {
    priority: 10,
    name: "Kenya Crypto | Airdrops & Apps",
    initials: "KE",
    category: "airdrops",
    region: "kenya",
    language: "english",
    audience: "Kenya / East Africa",
    topicLabel: "Airdrops & apps",
    regionLabel: "Kenya",
    languageLabel: "English",
    description:
      "Filtered crypto opportunities, wallets, stablecoins, and apps relevant to Kenyan users.",
  },
];

const grid = document.querySelector("[data-market-grid]");
const count = document.querySelector("[data-market-results-count]");
const empty = document.querySelector("[data-market-empty]");
const search = document.querySelector("[data-market-search]");
const filters = Array.from(document.querySelectorAll("[data-market-filter]"));
const sort = document.querySelector("[data-market-sort]");
const clear = document.querySelector("[data-market-clear]");

function cardMarkup(channel) {
  return `
    <article class="marketplace-channel-card">
      <div class="marketplace-channel-top">
        <span class="marketplace-channel-avatar" aria-hidden="true">${channel.initials}</span>
        <span class="marketplace-channel-status">Launch inventory</span>
      </div>

      <h2>${channel.name}</h2>
      <p class="marketplace-channel-description">${channel.description}</p>

      <div class="marketplace-channel-tags" aria-label="Channel tags">
        <span>${channel.topicLabel}</span>
        <span>${channel.regionLabel}</span>
        <span>${channel.languageLabel}</span>
      </div>

      <div class="marketplace-channel-meta">
        <div>
          <span>Audience</span>
          <strong>${channel.audience}</strong>
        </div>
        <div>
          <span>Ownership</span>
          <strong>UIORI-owned</strong>
        </div>
      </div>
    </article>
  `;
}

function normalizedSearch() {
  return search?.value.trim().toLowerCase() || "";
}

function selectedFilters() {
  const values = {};
  filters.forEach((select) => {
    values[select.dataset.marketFilter] = select.value;
  });
  return values;
}

function filteredChannels() {
  const query = normalizedSearch();
  const values = selectedFilters();

  const result = channels.filter((channel) => {
    if (
      query &&
      ![
        channel.name,
        channel.description,
        channel.topicLabel,
        channel.regionLabel,
        channel.languageLabel,
        channel.audience,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    ) {
      return false;
    }

    return Object.entries(values).every(([key, value]) => {
      return !value || channel[key] === value;
    });
  });

  const mode = sort?.value || "priority";

  result.sort((a, b) => {
    if (mode === "name") return a.name.localeCompare(b.name);
    if (mode === "region") {
      return a.regionLabel.localeCompare(b.regionLabel) || a.priority - b.priority;
    }
    return a.priority - b.priority;
  });

  return result;
}

function render() {
  if (!grid || !count || !empty) return;

  const result = filteredChannels();
  grid.innerHTML = result.map(cardMarkup).join("");
  count.textContent = `${result.length} of ${channels.length} launch channels shown`;
  empty.hidden = result.length !== 0;
  grid.hidden = result.length === 0;
}

function resetFilters() {
  if (search) search.value = "";
  filters.forEach((select) => {
    select.value = "";
  });
  if (sort) sort.value = "priority";
  render();
}

search?.addEventListener("input", render);
filters.forEach((select) => select.addEventListener("change", render));
sort?.addEventListener("change", render);
clear?.addEventListener("click", resetFilters);

render();
