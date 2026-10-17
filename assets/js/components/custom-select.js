let globalEventsBound = false;
const closeTimers = new WeakMap();

function closeSelect(wrapper, returnFocus = false) {
  const button = wrapper.querySelector(".ui-select-button");
  const existingTimer = closeTimers.get(wrapper);

  if (existingTimer) {
    window.clearTimeout(existingTimer);
  }

  wrapper.classList.remove("is-open");

  const timer = window.setTimeout(() => {
    if (!wrapper.classList.contains("is-open")) {
      wrapper.classList.remove("is-dropup");
    }
    closeTimers.delete(wrapper);
  }, 170);

  closeTimers.set(wrapper, timer);

  if (button) {
    button.setAttribute("aria-expanded", "false");

    if (returnFocus) {
      button.focus();
    }
  }
}

function closeAllSelects(except = null) {
  document.querySelectorAll(".ui-select.is-open").forEach((wrapper) => {
    if (wrapper !== except) {
      closeSelect(wrapper);
    }
  });
}

function bindGlobalEvents() {
  if (globalEventsBound) return;

  globalEventsBound = true;

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".ui-select")) {
      closeAllSelects();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

    const openSelect = document.querySelector(".ui-select.is-open");

    if (openSelect) {
      closeSelect(openSelect, true);
    }
  });

  window.addEventListener("resize", () => {
    closeAllSelects();
  });
}

function enhanceSelect(select) {
  if (select.dataset.uiSelectReady === "true") return;

  select.dataset.uiSelectReady = "true";

  const wrapper = document.createElement("div");
  wrapper.className = "ui-select";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "ui-select-button";
  button.setAttribute("aria-haspopup", "listbox");
  button.setAttribute("aria-expanded", "false");

  const label = document.createElement("span");
  label.className = "ui-select-button-label";

  const chevron = document.createElementNS("http://www.w3.org/2000/svg", "svg");

  chevron.classList.add("ui-select-chevron");
  chevron.setAttribute("viewBox", "0 0 24 24");
  chevron.setAttribute("aria-hidden", "true");

  const chevronPath = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path",
  );

  chevronPath.setAttribute("d", "m6 9 6 6 6-6");

  chevron.appendChild(chevronPath);

  const menu = document.createElement("div");
  menu.className = "ui-select-menu";
  menu.setAttribute("role", "listbox");

  const menuId = `${
    select.id || `ui-select-${Math.random().toString(36).slice(2)}`
  }-menu`;

  menu.id = menuId;
  button.setAttribute("aria-controls", menuId);

  select.parentNode.insertBefore(wrapper, select);

  wrapper.appendChild(select);
  wrapper.appendChild(button);
  wrapper.appendChild(menu);

  select.classList.add("ui-select-native");

  button.appendChild(label);
  button.appendChild(chevron);

  function getOptionButtons() {
    return Array.from(menu.querySelectorAll(".ui-select-option"));
  }

  function sync() {
    const selected = select.options[select.selectedIndex] || select.options[0];

    label.textContent = selected ? selected.textContent.trim() : "";

    menu.innerHTML = "";

    Array.from(select.options).forEach((option) => {
      if (option.disabled && !option.value) return;

      const optionButton = document.createElement("button");

      optionButton.type = "button";
      optionButton.className = "ui-select-option";
      optionButton.dataset.value = option.value;
      optionButton.setAttribute("role", "option");
      optionButton.setAttribute(
        "aria-selected",
        option.selected ? "true" : "false",
      );
      optionButton.textContent = option.textContent.trim();

      if (option.selected) {
        optionButton.classList.add("is-selected");
      }

      if (option.disabled) {
        optionButton.disabled = true;
      }

      optionButton.addEventListener("click", () => {
        select.value = option.value;

        select.dispatchEvent(
          new Event("change", {
            bubbles: true,
          }),
        );

        sync();
        closeSelect(wrapper, true);
      });

      menu.appendChild(optionButton);
    });

    button.disabled = select.disabled;
  }

  function openSelect() {
    closeAllSelects(wrapper);

    const existingTimer = closeTimers.get(wrapper);
    if (existingTimer) {
      window.clearTimeout(existingTimer);
      closeTimers.delete(wrapper);
    }

    const buttonRect = button.getBoundingClientRect();
    const menuHeight = Math.min(menu.scrollHeight, 230);
    const spaceBelow = window.innerHeight - buttonRect.bottom - 12;
    const spaceAbove = buttonRect.top - 12;

    const shouldDropUp = spaceBelow < menuHeight && spaceAbove > spaceBelow;
    const availableSpace = shouldDropUp ? spaceAbove : spaceBelow;

    menu.style.maxHeight = `${Math.max(96, Math.min(230, Math.floor(availableSpace)))}px`;
    wrapper.classList.toggle("is-dropup", shouldDropUp);
    button.setAttribute("aria-expanded", "true");

    requestAnimationFrame(() => {
      wrapper.classList.add("is-open");

      requestAnimationFrame(() => {
        const selectedButton =
          menu.querySelector(".ui-select-option.is-selected") ||
          menu.querySelector(".ui-select-option:not(:disabled)");

        selectedButton?.focus({ preventScroll: true });
      });
    });
  }

  button.addEventListener("click", () => {
    if (wrapper.classList.contains("is-open")) {
      closeSelect(wrapper);
      return;
    }

    openSelect();
  });

  button.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      openSelect();
    }
  });

  menu.addEventListener("keydown", (event) => {
    const options = getOptionButtons().filter((option) => !option.disabled);

    if (!options.length) return;

    const currentIndex = options.indexOf(document.activeElement);

    if (event.key === "Escape") {
      event.preventDefault();
      closeSelect(wrapper, true);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();

      const nextIndex =
        currentIndex < 0 ? 0 : (currentIndex + 1) % options.length;

      options[nextIndex].focus();
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      const previousIndex =
        currentIndex <= 0 ? options.length - 1 : currentIndex - 1;

      options[previousIndex].focus();
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      options[0].focus();
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      options[options.length - 1].focus();
    }
  });

  select.addEventListener("change", sync);

  select.form?.addEventListener("reset", () => {
    requestAnimationFrame(sync);
  });

  sync();
}

export function initCustomSelects(root = document) {
  root.querySelectorAll("select[data-ui-select]").forEach(enhanceSelect);

  bindGlobalEvents();
}
