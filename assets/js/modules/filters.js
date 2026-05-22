const countrySelectSelector = "[data-route-country], [data-country-jump]";

function sortCountryOptions(select) {
  let options = Array.from(select.options);
  let placeholder = options.find((option) => option.value === "");

  if (!placeholder) {
    placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Choose a country";
  }

  const realOptions = options.filter((option) => option.value !== "");

  realOptions.sort((a, b) =>
    a.textContent.trim().localeCompare(b.textContent.trim(), "en"),
  );

  select.replaceChildren(placeholder, ...realOptions);
  select.value = "";

  Array.from(select.options).forEach((option) => {
    option.defaultSelected = option.value === "";
    option.selected = option.value === "";
  });
}

function sortCountryCards() {
  document.querySelectorAll(".card-grid").forEach((grid) => {
    const cards = Array.from(grid.children).filter((child) =>
      child.classList?.contains("country-card"),
    );
    if (cards.length < 2) return;

    cards
      .sort((a, b) => {
        const aName = a.querySelector("strong")?.textContent?.trim() || "";
        const bName = b.querySelector("strong")?.textContent?.trim() || "";
        return aName.localeCompare(bName, "en");
      })
      .forEach((card) => grid.appendChild(card));
  });
}

function getSelectText(select) {
  return select.options[select.selectedIndex]?.textContent?.trim() || "Choose";
}

function closeCustomSelects(exceptWrapper) {
  document.querySelectorAll(".ui-select.is-open").forEach((wrapper) => {
    if (wrapper !== exceptWrapper) wrapper.classList.remove("is-open");
  });
}

function enhanceSelect(select) {
  if (select.dataset.enhancedSelect === "true") return;
  select.dataset.enhancedSelect = "true";

  const wrapper = document.createElement("span");
  wrapper.className = "ui-select";
  select.parentNode.insertBefore(wrapper, select);
  wrapper.appendChild(select);
  select.classList.add("native-select-hidden");

  const button = document.createElement("button");
  button.type = "button";
  button.className = "ui-select-button";
  button.setAttribute("aria-haspopup", "listbox");
  button.setAttribute("aria-expanded", "false");

  const buttonText = document.createElement("span");
  buttonText.className = "ui-select-text";
  buttonText.textContent = getSelectText(select);

  const buttonIcon = document.createElement("span");
  buttonIcon.className = "ui-select-icon";
  buttonIcon.setAttribute("aria-hidden", "true");

  button.append(buttonText, buttonIcon);

  const menu = document.createElement("div");
  menu.className = "ui-select-menu";
  menu.setAttribute("role", "listbox");

  Array.from(select.options).forEach((option) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "ui-select-option";
    item.setAttribute("role", "option");
    item.dataset.value = option.value;
    item.textContent = option.textContent;

    if (option.selected) item.setAttribute("aria-selected", "true");

    item.addEventListener("click", () => {
      select.value = option.value;
      buttonText.textContent = option.textContent;
      menu
        .querySelectorAll(".ui-select-option")
        .forEach((node) => node.removeAttribute("aria-selected"));
      item.setAttribute("aria-selected", "true");
      wrapper.classList.remove("is-open");
      button.setAttribute("aria-expanded", "false");
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });

    menu.appendChild(item);
  });

  button.addEventListener("click", () => {
    const willOpen = !wrapper.classList.contains("is-open");
    closeCustomSelects(wrapper);
    wrapper.classList.toggle("is-open", willOpen);
    button.setAttribute("aria-expanded", String(willOpen));
  });

  select.addEventListener("change", () => {
    buttonText.textContent = getSelectText(select);
  });

  wrapper.append(button, menu);
}

function initCustomSelects() {
  document.querySelectorAll(countrySelectSelector).forEach(sortCountryOptions);
  document.querySelectorAll("select").forEach(enhanceSelect);
  sortCountryCards();

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".ui-select")) closeCustomSelects();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeCustomSelects();
  });
}

function applyFilterGroup(group) {
  const items = Array.from(
    document.querySelectorAll(`[data-filter-group="${group}"] [data-filter-item]`),
  );
  const queries = Array.from(
    document.querySelectorAll(`[data-filter-input="${group}"]`),
  )
    .map((input) => input.value.trim().toLowerCase())
    .filter(Boolean);
  const selectedTags = Array.from(
    document.querySelectorAll(`[data-select-filter="${group}"]`),
  )
    .map((select) => select.value)
    .filter((value) => value && value !== "all");

  items.forEach((item) => {
    const haystack = (item.getAttribute("data-filter-item") || item.textContent).toLowerCase();
    const tags = (item.getAttribute("data-tags") || "").split("|");
    const matchesQuery = queries.every((query) => haystack.includes(query));
    const matchesTags = selectedTags.every((tag) => tags.includes(tag));

    item.classList.toggle("is-hidden", !matchesQuery || !matchesTags);
  });
}

export function initFilters() {
  initCustomSelects();

  document.querySelectorAll("[data-filter-input]").forEach((input) => {
    const group = input.getAttribute("data-filter-input");
    input.addEventListener("input", () => applyFilterGroup(group));
  });

  document.querySelectorAll("[data-select-filter]").forEach((select) => {
    const group = select.getAttribute("data-select-filter");
    select.addEventListener("change", () => applyFilterGroup(group));
  });
}
