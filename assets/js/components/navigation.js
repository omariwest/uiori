export function initNavigation() {
  const toggle = document.querySelector(".menu-toggle");
  const menu = document.querySelector("#mobile-navigation");
  const backdrop = document.querySelector("[data-nav-backdrop]");

  if (!toggle || !menu || !backdrop) return;
  if (toggle.dataset.uioriNavReady === "true") return;
  toggle.dataset.uioriNavReady = "true";

  const desktopQuery = window.matchMedia("(min-width: 1025px)");

  function isOpen() {
    return menu.classList.contains("active");
  }

  function setMenu(open) {
    menu.classList.toggle("active", open);
    backdrop.classList.toggle("active", open);
    toggle.classList.toggle("is-open", open);
    document.body.classList.toggle("mobile-menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }

  function closeMenu() {
    setMenu(false);
  }

  toggle.addEventListener("click", () => setMenu(!isOpen()));
  backdrop.addEventListener("click", closeMenu);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  menu.addEventListener("click", (event) => {
    if (event.target.closest("a")) closeMenu();
  });

  desktopQuery.addEventListener("change", (event) => {
    if (event.matches) closeMenu();
  });
}
